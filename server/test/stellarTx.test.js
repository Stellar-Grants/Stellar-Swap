const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAndSubmitWithRetry, SequenceConflictError } = require('../utils/stellarTx');

function badSeqError() {
    const error = new Error('tx_bad_seq');
    error.response = { data: { extras: { result_codes: { transaction: 'txBAD_SEQ' } } } };
    return error;
}

// Simulates a Stellar ledger where the account's sequence number only
// advances when a transaction built from the current sequence is submitted,
// exactly like the real network rejecting stale sequence numbers.
function createMockLedger(startingSequence) {
    let sequence = startingSequence;
    let conflicts = 0;
    return {
        async loadAccount() {
            // Snapshot the sequence number before the artificial delay so
            // concurrent callers both read the same stale value before
            // either submits, reproducing the real-world race.
            const snapshot = sequence;
            await new Promise((resolve) => setTimeout(resolve, 20));
            return { sequence: snapshot };
        },
        async submitTransaction(transaction) {
            if (transaction.sequence !== sequence) {
                conflicts += 1;
                throw badSeqError();
            }
            sequence += 1;
            return { hash: `tx-${sequence}`, ledger: sequence, created_at: 'now' };
        },
        conflictCount: () => conflicts,
    };
}

const keypair = { publicKey: () => 'GFAKEPUBLICKEY' };
const buildFakeTransaction = (account) => ({ sequence: account.sequence, sign() {} });

test('two concurrent requests for the same account both eventually succeed', async () => {
    const ledger = createMockLedger(100);

    const [resultA, resultB] = await Promise.all([
        buildAndSubmitWithRetry(ledger, keypair, buildFakeTransaction, { retryDelayMs: 5 }),
        buildAndSubmitWithRetry(ledger, keypair, buildFakeTransaction, { retryDelayMs: 5 }),
    ]);

    assert.notEqual(resultA.hash, resultB.hash);
    // Confirms this test actually reproduced a txBAD_SEQ collision rather
    // than the two calls happening to never overlap.
    assert.ok(ledger.conflictCount() >= 1, 'expected at least one simulated txBAD_SEQ conflict');
});

test('non-sequence errors are propagated immediately without retrying', async () => {
    let attempts = 0;
    const server = {
        async loadAccount() {
            attempts += 1;
            return { sequence: 100 };
        },
        async submitTransaction() {
            const error = new Error('insufficient balance');
            error.response = { data: { extras: { result_codes: { transaction: 'tx_INSUFFICIENT_BALANCE' } } } };
            throw error;
        },
    };

    await assert.rejects(
        () => buildAndSubmitWithRetry(server, keypair, buildFakeTransaction, { retryDelayMs: 5 }),
        (error) => error.response.data.extras.result_codes.transaction === 'tx_INSUFFICIENT_BALANCE'
    );
    assert.equal(attempts, 1);
});

test('exhausting retries on a persistent txBAD_SEQ throws a descriptive error', async () => {
    let attempts = 0;
    const server = {
        async loadAccount() {
            return { sequence: 100 };
        },
        async submitTransaction() {
            attempts += 1;
            throw badSeqError();
        },
    };

    await assert.rejects(
        () => buildAndSubmitWithRetry(server, keypair, buildFakeTransaction, { maxRetries: 3, retryDelayMs: 1 }),
        (error) => {
            assert.ok(error instanceof SequenceConflictError);
            assert.match(error.message, /sequence conflict/i);
            return true;
        }
    );
    assert.equal(attempts, 4);
});
