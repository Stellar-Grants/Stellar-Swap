process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../index');

test('GET / returns 200 and welcome message', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Welcome to Nexus Swap!');
});

test('GET /generate-keypair returns 200 with valid keypair', async () => {
    const res = await request(app).get('/generate-keypair');
    assert.equal(res.status, 200);
    assert.match(res.body.publicKey, /^G[A-Z2-7]{55}$/);
    assert.match(res.body.secretKey, /^S[A-Z2-7]{55}$/);
});

test('POST /fund-account returns 400 for missing publicKey', async () => {
    const res = await request(app).post('/fund-account').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Public key is required');
});

test('POST /fund-account returns 400 for invalid publicKey format', async () => {
    const res = await request(app).post('/fund-account').send({ publicKey: 'INVALID_PUBLIC_KEY' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Invalid public key format');
});

test('POST /deposit-tokens returns 400 for missing secretKey or tokens', async () => {
    const res = await request(app).post('/deposit-tokens').send({});
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
});

test('POST /withdraw-tokens returns 400 for missing poolId or secretKey', async () => {
    const res = await request(app).post('/withdraw-tokens').send({});
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
});

test('POST /swap-tokens returns 400 for missing assets or secretKey', async () => {
    const res = await request(app).post('/swap-tokens').send({});
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
});

test('POST /swap-quote returns 400 for missing fromAsset, toAsset or amount', async () => {
    const res = await request(app).post('/swap-quote').send({});
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
});

test('POST /fee-bump returns 400 for missing innerTxXdr', async () => {
    const res = await request(app).post('/fee-bump').send({});
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
});

test('GET /account-info/:publicKey returns 400 for invalid publicKey format', async () => {
    const res = await request(app).get('/account-info/INVALID_KEY');
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
});
