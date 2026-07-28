const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 200;

// Thrown once retries are exhausted on a sequence-number conflict, so callers
// can tell it apart from other submission failures (e.g. insufficient balance).
class SequenceConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SequenceConflictError';
        this.isSequenceConflict = true;
    }
}

function isBadSequenceError(error) {
    return error?.response?.data?.extras?.result_codes?.transaction === 'txBAD_SEQ';
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Resolves an int option from (in priority order) an explicit value, an env
// var, or a default — treating an explicit "0" as valid rather than falsy.
function resolveIntOption(explicitValue, envValue, defaultValue) {
    if (explicitValue !== undefined) return explicitValue;
    const parsed = parseInt(envValue, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
}

// Builds, signs and submits a Stellar transaction. If the submission fails
// with txBAD_SEQ (another transaction for the same account was submitted in
// between the account load and this submission), the account is reloaded to
// pick up the new sequence number and the transaction is rebuilt from
// scratch. Retries back off exponentially (200ms, 400ms, 800ms by default).
async function buildAndSubmitWithRetry(server, keypair, buildTransaction, options = {}) {
    const maxRetries = resolveIntOption(options.maxRetries, process.env.TX_MAX_RETRIES, DEFAULT_MAX_RETRIES);
    const retryDelayMs = resolveIntOption(options.retryDelayMs, process.env.TX_RETRY_DELAY_MS, DEFAULT_RETRY_DELAY_MS);

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const account = await server.loadAccount(keypair.publicKey());
            const transaction = buildTransaction(account);
            transaction.sign(keypair);
            return await server.submitTransaction(transaction);
        } catch (error) {
            lastError = error;
            if (!isBadSequenceError(error) || attempt === maxRetries) {
                break;
            }
            await sleep(retryDelayMs * Math.pow(2, attempt));
        }
    }

    if (isBadSequenceError(lastError)) {
        throw new SequenceConflictError(
            'Transaction failed due to sequence conflict — another transaction may have been submitted simultaneously. Please try again.'
        );
    }
    throw lastError;
}

module.exports = { buildAndSubmitWithRetry, SequenceConflictError, isBadSequenceError };
