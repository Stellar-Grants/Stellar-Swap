// Known environment variables, their defaults, and (where applicable) the
// set of values they're allowed to take. Kept in sync with server/.env.example.
const ENV_VARS = [
    { key: 'PORT', default: '8000', description: 'HTTP port' },
    { key: 'CORS_ORIGIN', default: 'http://localhost:3000', description: 'Allowed CORS origin' },
    { key: 'STELLAR_NETWORK', default: 'testnet', allowed: ['testnet', 'mainnet'], description: 'Stellar network to connect to' },
    { key: 'HORIZON_URL', default: 'https://horizon-testnet.stellar.org', description: 'Horizon REST API URL' },
    { key: 'TX_MAX_RETRIES', default: '3', description: 'Max retries on txBAD_SEQ sequence conflicts' },
    { key: 'TX_RETRY_DELAY_MS', default: '200', description: 'Base delay (ms) for retry backoff' },
];

// Checks env against ENV_VARS and reports problems without exiting, so
// startup (which decides what to do with the result) stays testable.
function validateEnv(env = process.env) {
    const errors = [];
    const warnings = [];

    for (const { key, default: def, allowed, description } of ENV_VARS) {
        const value = env[key];
        if (!value) {
            warnings.push(`${key} not set — using default: ${def} (${description})`);
        } else if (allowed && !allowed.includes(value)) {
            errors.push(`Invalid value for ${key}: "${value}". Allowed values: ${allowed.join(', ')}`);
        }
    }

    return { errors, warnings };
}

module.exports = { validateEnv, ENV_VARS };
