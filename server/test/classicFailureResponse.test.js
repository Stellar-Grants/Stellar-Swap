const test = require('node:test');
const assert = require('node:assert/strict');
const {
    buildAndSubmitWithRetry,
    isSubmitTimeout,
    classicFailureResponse,
} = require('../utils/stellarTx');

// Shapes a Horizon submission rejection the way @stellar/stellar-sdk surfaces
// it: the decoded transaction result lives under response.data.extras.
function horizonResultCodesError(resultCodes, status = 400) {
    const error = new Error('Request failed with status code ' + status);
    error.response = { status, data: { extras: { result_codes: resultCodes } } };
    return error;
}

test('isSubmitTimeout recognises a Horizon 504 and an axios client timeout', () => {
    assert.equal(isSubmitTimeout({ response: { status: 504 } }), true);
    assert.equal(isSubmitTimeout({ code: 'ECONNABORTED' }), true);
    assert.equal(isSubmitTimeout({ response: { status: 400 } }), false);
    assert.equal(isSubmitTimeout(new Error('boom')), false);
    assert.equal(isSubmitTimeout(undefined), false);
});

test('classicFailureResponse surfaces Horizon result codes as transactionCode and operationCodes', () => {
    const error = horizonResultCodesError({
        transaction: 'tx_failed',
        operations: ['op_underfunded', 'op_no_trust'],
    });

    const { status, body } = classicFailureResponse(error);

    assert.equal(status, 400);
    assert.deepEqual(body, {
        error: 'Transaction failed',
        transactionCode: 'tx_failed',
        operationCodes: ['op_underfunded', 'op_no_trust'],
    });
});

test('classicFailureResponse still returns 400 when only a transaction-level code is present', () => {
    const { status, body } = classicFailureResponse(
        horizonResultCodesError({ transaction: 'tx_bad_auth' })
    );

    assert.equal(status, 400);
    assert.equal(body.transactionCode, 'tx_bad_auth');
    assert.equal(body.operationCodes, undefined);
});

test('classicFailureResponse maps a sequence conflict to a 500 with its descriptive message', () => {
    const error = new Error('another transaction may have been submitted simultaneously');
    error.isSequenceConflict = true;

    const { status, body } = classicFailureResponse(error);

    assert.equal(status, 500);
    assert.deepEqual(body, { error: error.message });
});

test('classicFailureResponse maps a confirmation timeout to 504 and echoes the transaction hash', () => {
    const error = new Error('timeout of 0ms exceeded');
    error.code = 'ECONNABORTED';
    error.transactionHash = 'deadbeef';

    const { status, body } = classicFailureResponse(error);

    assert.equal(status, 504);
    assert.match(body.error, /timed out before confirmation/i);
    assert.equal(body.transactionHash, 'deadbeef');
});

test('classicFailureResponse falls back to a generic 500 for an error with no result codes', () => {
    const { status, body } = classicFailureResponse(new Error('socket hang up'));

    assert.equal(status, 500);
    assert.deepEqual(body, { error: 'An unexpected error occurred' });
});

test('buildAndSubmitWithRetry tags a non-sequence failure with the built transaction hash', async () => {
    const server = {
        async loadAccount() {
            return { sequence: 100 };
        },
        async submitTransaction() {
            const error = new Error('Request failed with status code 504');
            error.response = { status: 504 };
            throw error;
        },
    };
    const keypair = { publicKey: () => 'GFAKEPUBLICKEY' };
    const buildTransaction = (account) => ({
        sequence: account.sequence,
        sign() {},
        hash: () => Buffer.from('c0ffee', 'hex'),
    });

    await assert.rejects(
        () => buildAndSubmitWithRetry(server, keypair, buildTransaction, { retryDelayMs: 1 }),
        (error) => {
            assert.equal(error.transactionHash, 'c0ffee');
            // The hash must flow through to the API response contract.
            assert.equal(classicFailureResponse(error).body.transactionHash, 'c0ffee');
            return true;
        }
    );
});
