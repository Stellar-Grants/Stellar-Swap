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

// Horizon's submitTransaction() blocks until the transaction is included in a
// ledger, or rejects. A confirmation timeout surfaces as either an HTTP 504
// from Horizon or a client-side axios timeout (no response received).
function isSubmitTimeout(error) {
    return error?.response?.status === 504 || error?.code === 'ECONNABORTED';
}

// Maps a failed Classic Stellar submission to an { status, body } pair for the
// API response. Prefers Horizon's decoded result_codes (the transaction-level
// code and the per-operation codes); otherwise falls back to the sequence
// conflict and confirmation-timeout signals, then a generic 500.
function classicFailureResponse(error) {
    if (error?.isSequenceConflict) {
        return { status: 500, body: { error: error.message } };
    }
    if (isSubmitTimeout(error)) {
        return {
            status: 504,
            body: {
                error: 'Transaction submission timed out before confirmation. It may still be included in a later ledger.',
                transactionHash: error?.transactionHash,
            },
        };
    }
    const resultCodes = error?.response?.data?.extras?.result_codes;
    if (resultCodes) {
        return {
            status: 400,
            body: {
                error: 'Transaction failed',
                transactionCode: resultCodes.transaction,
                operationCodes: resultCodes.operations,
            },
        };
    }
    return { status: 500, body: { error: 'An unexpected error occurred' } };
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
        let transaction;
        try {
            const account = await server.loadAccount(keypair.publicKey());
            transaction = buildTransaction(account);
            transaction.sign(keypair);
            return await server.submitTransaction(transaction);
        } catch (error) {
            lastError = error;
            // Attach the hash of the transaction that failed so a confirmation
            // timeout can report which transaction may still land in a ledger.
            if (transaction && error && error.transactionHash === undefined) {
                try {
                    error.transactionHash = transaction.hash().toString('hex');
                } catch {
                    // transaction.hash() unavailable (e.g. a test double) — skip.
                }
            }
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

module.exports = {
    buildAndSubmitWithRetry,
    SequenceConflictError,
    isBadSequenceError,
    isSubmitTimeout,
    classicFailureResponse,
};
