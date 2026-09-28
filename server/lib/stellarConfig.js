const { Networks } = require('@stellar/stellar-sdk');

const NETWORK = process.env.STELLAR_NETWORK || 'testnet';

const NETWORK_CONFIG = {
    testnet: {
        rpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
        networkPassphrase: Networks.TESTNET,
        horizonUrl: process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org',
        friendbotUrl: 'https://friendbot.stellar.org',
    },
    mainnet: {
        rpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-mainnet.stellar.org',
        networkPassphrase: Networks.PUBLIC,
        horizonUrl: process.env.HORIZON_URL || 'https://horizon.stellar.org',
        friendbotUrl: null, // No friendbot on mainnet
    },
};

if (!NETWORK_CONFIG[NETWORK]) {
    console.error(`Invalid STELLAR_NETWORK: "${NETWORK}". Must be "testnet" or "mainnet".`);
    process.exit(1);
}

const config = NETWORK_CONFIG[NETWORK];

function getNetworkConfig(env = process.env) {
    const net = env.STELLAR_NETWORK || 'testnet';
    const cfg = {
        testnet: {
            rpcUrl: env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
            networkPassphrase: Networks.TESTNET,
            horizonUrl: env.HORIZON_URL || 'https://horizon-testnet.stellar.org',
            friendbotUrl: 'https://friendbot.stellar.org',
        },
        mainnet: {
            rpcUrl: env.STELLAR_RPC_URL || 'https://soroban-mainnet.stellar.org',
            networkPassphrase: Networks.PUBLIC,
            horizonUrl: env.HORIZON_URL || 'https://horizon.stellar.org',
            friendbotUrl: null,
        },
    };
    if (!cfg[net]) {
        throw new Error(`Invalid STELLAR_NETWORK: "${net}". Must be "testnet" or "mainnet".`);
    }
    return cfg[net];
}

module.exports = {
    ...config,
    getNetworkConfig,
};
