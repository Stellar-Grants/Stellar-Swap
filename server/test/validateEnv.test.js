const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEnv } = require('../utils/validateEnv');

test('an empty environment produces a warning for every known var and no errors', () => {
    const { errors, warnings } = validateEnv({});

    assert.equal(errors.length, 0);
    assert.ok(warnings.some((w) => w.startsWith('PORT not set')));
    assert.ok(warnings.some((w) => w.startsWith('CORS_ORIGIN not set')));
    assert.ok(warnings.some((w) => w.startsWith('STELLAR_NETWORK not set')));
    assert.ok(warnings.some((w) => w.startsWith('HORIZON_URL not set')));
});

test('a valid STELLAR_NETWORK value produces no errors or warnings for that key', () => {
    const { errors, warnings } = validateEnv({ STELLAR_NETWORK: 'mainnet' });

    assert.equal(errors.length, 0);
    assert.ok(!warnings.some((w) => w.startsWith('STELLAR_NETWORK')));
});

test('an invalid STELLAR_NETWORK value is reported as an error naming the allowed values', () => {
    const { errors } = validateEnv({ STELLAR_NETWORK: 'TESTNET' });

    assert.equal(errors.length, 1);
    assert.match(errors[0], /STELLAR_NETWORK/);
    assert.match(errors[0], /testnet, mainnet/);
});

test('a fully configured environment produces no errors or warnings', () => {
    const { errors, warnings } = validateEnv({
        PORT: '8000',
        CORS_ORIGIN: 'http://localhost:3000',
        STELLAR_NETWORK: 'testnet',
        HORIZON_URL: 'https://horizon-testnet.stellar.org',
        TX_MAX_RETRIES: '3',
        TX_RETRY_DELAY_MS: '200',
    });

    assert.equal(errors.length, 0);
    assert.equal(warnings.length, 0);
});
