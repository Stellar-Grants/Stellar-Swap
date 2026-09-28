const test = require('node:test');
const assert = require('node:assert/strict');
const { Networks } = require('@stellar/stellar-sdk');
const stellarConfig = require('../lib/stellarConfig');
const { getNetworkConfig } = require('../lib/stellarConfig');

test('stellarConfig exports required network properties', () => {
    assert.ok(stellarConfig.rpcUrl, 'rpcUrl should be defined');
    assert.ok(stellarConfig.networkPassphrase, 'networkPassphrase should be defined');
    assert.ok(stellarConfig.horizonUrl, 'horizonUrl should be defined');
    assert.equal(stellarConfig.friendbotUrl, 'https://friendbot.stellar.org');
    assert.equal(stellarConfig.networkPassphrase, Networks.TESTNET);
});

test('getNetworkConfig returns correct testnet defaults', () => {
    const cfg = getNetworkConfig({ STELLAR_NETWORK: 'testnet' });
    assert.equal(cfg.rpcUrl, 'https://soroban-testnet.stellar.org');
    assert.equal(cfg.networkPassphrase, Networks.TESTNET);
    assert.equal(cfg.horizonUrl, 'https://horizon-testnet.stellar.org');
    assert.equal(cfg.friendbotUrl, 'https://friendbot.stellar.org');
});

test('getNetworkConfig returns correct mainnet defaults', () => {
    const cfg = getNetworkConfig({ STELLAR_NETWORK: 'mainnet' });
    assert.equal(cfg.rpcUrl, 'https://soroban-mainnet.stellar.org');
    assert.equal(cfg.networkPassphrase, Networks.PUBLIC);
    assert.equal(cfg.horizonUrl, 'https://horizon.stellar.org');
    assert.equal(cfg.friendbotUrl, null);
});

test('STELLAR_RPC_URL overrides rpcUrl on testnet and mainnet', () => {
    const customTestnet = getNetworkConfig({
        STELLAR_NETWORK: 'testnet',
        STELLAR_RPC_URL: 'https://custom-testnet.example.com',
    });
    assert.equal(customTestnet.rpcUrl, 'https://custom-testnet.example.com');

    const customMainnet = getNetworkConfig({
        STELLAR_NETWORK: 'mainnet',
        STELLAR_RPC_URL: 'https://custom-mainnet.example.com',
    });
    assert.equal(customMainnet.rpcUrl, 'https://custom-mainnet.example.com');
});

test('getNetworkConfig throws on invalid STELLAR_NETWORK value', () => {
    assert.throws(
        () => getNetworkConfig({ STELLAR_NETWORK: 'invalid_network' }),
        /Invalid STELLAR_NETWORK/
    );
});
