const test = require('node:test');
const assert = require('node:assert/strict');
const {
    generateKeyPair,
    fundAccount,
    parseSlippage,
    parseHistoryLimit,
} = require('../controllers/tokenControllers');

test('generateKeyPair returns a valid Stellar public and secret key pair', async () => {
    let responseData = null;
    const req = {};
    const res = {
        json: (data) => {
            responseData = data;
        },
    };

    await generateKeyPair(req, res);

    assert.ok(responseData, 'Response data should be returned');
    assert.match(responseData.publicKey, /^G[A-Z2-7]{55}$/, 'Public key should be a valid 56-char Stellar G address');
    assert.match(responseData.secretKey, /^S[A-Z2-7]{55}$/, 'Secret key should be a valid 56-char Stellar S secret key');
});

test('fundAccount returns 400 when publicKey is missing', async () => {
    let statusCode = 200;
    let responseData = null;
    const req = { body: {} };
    const res = {
        status: (code) => {
            statusCode = code;
            return {
                json: (data) => {
                    responseData = data;
                },
            };
        },
    };

    await fundAccount(req, res);

    assert.equal(statusCode, 400);
    assert.equal(responseData.error, 'Public key is required');
});

test('fundAccount returns 400 when publicKey has an invalid format', async () => {
    let statusCode = 200;
    let responseData = null;
    const req = { body: { publicKey: 'NOT_A_VALID_STELLAR_KEY' } };
    const res = {
        status: (code) => {
            statusCode = code;
            return {
                json: (data) => {
                    responseData = data;
                },
            };
        },
    };

    await fundAccount(req, res);

    assert.equal(statusCode, 400);
    assert.equal(responseData.error, 'Invalid public key format');
});

test('fundAccount succeeds when friendbot returns 200', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
        ok: true,
        json: async () => ({}),
    });

    try {
        let responseData = null;
        const validKey = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
        const req = { body: { publicKey: validKey } };
        const res = {
            json: (data) => {
                responseData = data;
            },
        };

        await fundAccount(req, res);

        assert.ok(responseData);
        assert.match(responseData.message, new RegExp(validKey));
    } finally {
        global.fetch = originalFetch;
    }
});

test('fundAccount returns 500 when friendbot fails', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
        ok: false,
        status: 400,
    });

    try {
        let statusCode = 200;
        let responseData = null;
        const validKey = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
        const req = { body: { publicKey: validKey } };
        const res = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => {
                        responseData = data;
                    },
                };
            },
        };

        await fundAccount(req, res);

        assert.equal(statusCode, 500);
        assert.match(responseData.error, /Failed to fund account/);
    } finally {
        global.fetch = originalFetch;
    }
});

test('parseSlippage defaults to 1.0 when not provided', () => {
    assert.equal(parseSlippage(undefined), 1.0);
    assert.equal(parseSlippage(null), 1.0);
});

test('parseSlippage accepts valid percentage values between 0.01 and 50', () => {
    assert.equal(parseSlippage('0.5'), 0.5);
    assert.equal(parseSlippage('2.5'), 2.5);
    assert.equal(parseSlippage('50'), 50);
});

test('parseSlippage rejects values outside 0.01 - 50 range or invalid numbers', () => {
    assert.equal(parseSlippage('0.001'), null);
    assert.equal(parseSlippage('50.1'), null);
    assert.equal(parseSlippage('-1'), null);
    assert.equal(parseSlippage('abc'), null);
});
