const {
    Keypair,
    Horizon,
    StrKey,
    TransactionBuilder,
    Asset,
    Operation,
    LiquidityPoolAsset,
    getLiquidityPoolId,
    BASE_FEE,
    Networks
} = require('@stellar/stellar-sdk');


// Parse and validate a user-provided slippage tolerance (in percent).
// Defaults to 1.0% when not provided; returns null for invalid values
// so callers can respond with HTTP 400.
const parseSlippage = (raw) => {
    const slippage = parseFloat(raw ?? '1.0');
    if (!Number.isFinite(slippage) || slippage < 0.01 || slippage > 50) return null;
    return slippage;
};


exports.welcomeMsg = async (req, res) => {
    res.status(200).json({ message: "Welcome to Nexus Swap!" });
};

async function fundAccountWithFriendbot(address) {
    const friendbotUrl = `https://friendbot.stellar.org?addr=${address}`;
    try {
        let response = await fetch(friendbotUrl);
        if (response.ok) {
            console.log(`Account ${address} successfully funded.`);
            return true;
        } else {
            console.log(`Something went wrong funding account: ${address}.`);
            return false;
        }
    } catch (error) {
        console.error(`Error funding account ${address}:`, error);
        return false;
    }
}

exports.fundAccount = async (req, res) => {
    const { publicKey } = req.body;

    if (!publicKey) {
        return res.status(400).json({ error: 'Public key is required' });
    }

    const funded = await fundAccountWithFriendbot(publicKey);

    if (funded) {
        res.json({ message: `Account ${publicKey} successfully funded.` });
    } else {
        res.status(500).json({ error: `Failed to fund account ${publicKey}.` });
    }
};

function parseHistoryLimit(limit) {
    const parsedLimit = parseInt(limit, 10);

    if (Number.isNaN(parsedLimit)) {
        return 20;
    }

    return Math.min(Math.max(parsedLimit, 1), 100);
}

function formatAsset(assetType, assetCode) {
    return assetType === 'native' ? 'XLM' : assetCode;
}

function validateAssetCode(code) {
    if (!code || typeof code !== 'string' || !/^[a-zA-Z0-9]{1,12}$/.test(code)) {
        return 'destAssetCode must be 1-12 alphanumeric characters';
    }
    return null;
}

function validateIssuerAddress(address) {
    if (!address || !StrKey.isValidEd25519PublicKey(address)) {
        return 'issuerAddress must be a valid Stellar public key';
    }
    return null;
}

function validatePositiveAmount(amount, field) {
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return `${field} must be a positive number`;
    }
    return null;
}

function mapOperation(op) {
    return {
        id: op.id,
        type: op.type,
        createdAt: op.created_at,
        transactionHash: op.transaction_hash,
        ...(op.type === 'liquidity_pool_deposit' && {
            liquidityPoolId: op.liquidity_pool_id,
            reservesDeposited: op.reserves_deposited,
            sharesReceived: op.shares_received,
        }),
        ...(op.type === 'liquidity_pool_withdraw' && {
            liquidityPoolId: op.liquidity_pool_id,
            reservesReceived: op.reserves_received,
            sharesRedeemed: op.shares,
        }),
        ...(op.type === 'path_payment_strict_receive' && {
            from: op.from,
            to: op.to,
            sourceAsset: formatAsset(op.source_asset_type, op.source_asset_code),
            sourceAmount: op.source_amount,
            destAsset: formatAsset(op.asset_type, op.asset_code),
            destAmount: op.amount,
        }),
        ...(op.type === 'path_payment_strict_send' && {
            from: op.from,
            to: op.to,
            sourceAsset: formatAsset(op.asset_type, op.asset_code),
            sourceAmount: op.amount,
            destAsset: formatAsset(op.dest_asset_type, op.dest_asset_code),
            destAmount: op.destination_amount,
        }),
        ...(op.type === 'change_trust' && {
            trustor: op.trustor,
            asset: op.asset_type === 'liquidity_pool_shares'
                ? op.liquidity_pool_id
                : formatAsset(op.asset_type, op.asset_code),
            limit: op.limit,
        }),
        ...(op.type === 'payment' && {
            from: op.from,
            to: op.to,
            asset: formatAsset(op.asset_type, op.asset_code),
            amount: op.amount,
        }),
    };
}

exports.getAccountHistory = async (req, res) => {
    const { publicKey } = req.params;
    const { limit = 20, cursor } = req.query;

    if (!StrKey.isValidEd25519PublicKey(publicKey)) {
        return res.status(400).json({ error: 'Invalid public key format' });
    }

    const parsedLimit = parseHistoryLimit(limit);
    const server = new Horizon.Server(process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org');

    try {
        let query = server
            .operations()
            .forAccount(publicKey)
            .limit(parsedLimit)
            .order('desc');

        if (cursor) {
            query = query.cursor(cursor);
        }

        const result = await query.call();
        const operations = result.records.map(mapOperation);

        res.json({
            operations,
            nextCursor: result.records.length === parsedLimit
                ? result.records[result.records.length - 1].paging_token
                : null,
        });
    } catch (error) {
        if (error?.response?.status === 404) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
};

exports.depositTokens = async (req, res) => {
    const { secretKey, tokenName, amountA, amountB } = req.body;

    const slippage = parseSlippage(req.body.slippage);
    if (slippage === null) {
        return res.status(400).json({ error: 'Slippage must be a number between 0.01 and 50' });
    }

    const numA = parseFloat(amountA);
    const numB = parseFloat(amountB);
    if (!Number.isFinite(numA) || !Number.isFinite(numB) || numA <= 0 || numB <= 0) {
        return res.status(400).json({ error: 'amountA and amountB must be positive numbers' });
    }

    const server = new Horizon.Server(process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org');

    try {
        const keypair = Keypair.fromSecret(secretKey);
        const account = await server.loadAccount(keypair.publicKey());

        const asset = new Asset(tokenName, keypair.publicKey());
        const liquidityPoolAsset = new LiquidityPoolAsset(Asset.native(), asset, 30);
        const liquidityPoolId = getLiquidityPoolId('constant_product', liquidityPoolAsset).toString('hex');

        // Bound the deposit price ratio (amountA/amountB) by the slippage tolerance.
        const slippagePct = slippage / 100;
        const price = numA / numB;
        const minPrice = (price * (1 - slippagePct)).toFixed(7);
        const maxPrice = (price * (1 + slippagePct)).toFixed(7);

        const depositTransaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(Operation.changeTrust({
                asset: liquidityPoolAsset
            }))
            .addOperation(Operation.liquidityPoolDeposit({
                liquidityPoolId: liquidityPoolId,
                maxAmountA: amountA,
                maxAmountB: amountB,
                minPrice: minPrice,
                maxPrice: maxPrice
            }))
            .setTimeout(30)
            .build();

        depositTransaction.sign(keypair);
        const result = await server.submitTransaction(depositTransaction);

        res.json({
            message: 'Deposit successful',
            asset,
            liquidityPoolId,
            transactionHash: result,
            ledger: result.ledger,
            createdAt: result.created_at,
        });
    } catch (error) {
        const resultCodes = error?.response?.data?.extras?.result_codes;
        if (resultCodes) {
            return res.status(400).json({
                error: 'Transaction failed',
                transactionCode: resultCodes.transaction,
                operationCodes: resultCodes.operations,
            });
        }
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};

exports.withdrawTokens = async (req, res) => {
    const { secretKey, liquidityPoolId, amount } = req.body;

    const slippage = parseSlippage(req.body.slippage);
    if (slippage === null) {
        return res.status(400).json({ error: 'Slippage must be a number between 0.01 and 50' });
    }

    const server = new Horizon.Server(process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org');

    try {
        const keypair = Keypair.fromSecret(secretKey);
        const account = await server.loadAccount(keypair.publicKey());

        const withdrawTransaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(Operation.liquidityPoolWithdraw({
                liquidityPoolId: liquidityPoolId,
                amount: amount,
                // minAmountA/minAmountB enforcement of the slippage tolerance is
                // deferred to Issue #25 (requires fetching the pool reserves to
                // compute the user's expected share).
                minAmountA: '0',
                minAmountB: '0'
            }))
            .setTimeout(30)
            .build();

        withdrawTransaction.sign(keypair);
        const result = await server.submitTransaction(withdrawTransaction);

        res.json({
            message: 'Withdrawal successful',
            transactionHash: result,
            ledger: result.ledger,
            createdAt: result.created_at,
        });
    } catch (error) {
        const resultCodes = error?.response?.data?.extras?.result_codes;
        if (resultCodes) {
            return res.status(400).json({
                error: 'Transaction failed',
                transactionCode: resultCodes.transaction,
                operationCodes: resultCodes.operations,
            });
        }
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};

exports.swapTokens = async (req, res) => {
    const { secretKey, destAssetCode, issuerAddress, sendMax, destAmount } = req.body;
    const server = new Horizon.Server(process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org');

    try {
        const keypair = Keypair.fromSecret(secretKey);
        const account = await server.loadAccount(keypair.publicKey());
        const destAsset = new Asset(destAssetCode, issuerAddress);
        const swapTransaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(Operation.changeTrust({
                asset: destAsset,
                source: keypair.publicKey()
            }))
            .addOperation(Operation.pathPaymentStrictReceive({
                sendAsset: Asset.native(),
                sendMax: sendMax,
                destination: keypair.publicKey(),
                destAsset: destAsset,
                destAmount: destAmount,
                source: keypair.publicKey(),
            }))
            .setTimeout(30)
            .build();

        swapTransaction.sign(keypair);
        const result = await server.submitTransaction(swapTransaction);

        res.json({
            message: 'Swap successful',
            transactionHash: result,
            ledger: result.ledger,
            createdAt: result.created_at,
        });
    } catch (error) {
        const resultCodes = error?.response?.data?.extras?.result_codes;
        if (resultCodes) {
            return res.status(400).json({
                error: 'Transaction failed',
                transactionCode: resultCodes.transaction,
                operationCodes: resultCodes.operations,
            });
        }
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
};

exports.getAccountInfo = async (req, res) => {
    const { publicKey } = req.params;

    if (!StrKey.isValidEd25519PublicKey(publicKey)) {
        return res.status(400).json({ error: 'Invalid public key format' });
    }

    const server = new Horizon.Server(process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org');

    try {
        const account = await server.loadAccount(publicKey);

        const balances = account.balances.map(b => ({
            assetType: b.asset_type,
            assetCode: b.asset_type === 'native' ? 'XLM' : b.asset_code,
            issuer: b.asset_issuer || null,
            balance: b.balance,
            liquidityPoolId: b.liquidity_pool_id || null,
        }));

        res.json({
            publicKey: account.id,
            sequenceNumber: account.sequence,
            balances,
        });
    } catch (error) {
        if (error?.response?.status === 404) {
            return res.status(404).json({ error: 'Account not found. It may not be funded yet.' });
        }
        res.status(500).json({ error: 'Failed to fetch account info' });
    }
};

exports.getSwapQuote = async (req, res) => {
    const { destAssetCode, issuerAddress, destAmount } = req.body;

    const errors = [
        validateAssetCode(destAssetCode),
        validateIssuerAddress(issuerAddress),
        validatePositiveAmount(destAmount, 'destAmount'),
    ].filter(Boolean);
    if (errors.length) {
        return res.status(400).json({ errors });
    }

    const server = new Horizon.Server(process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org');
    const destAsset = new Asset(destAssetCode, issuerAddress);

    try {
        const paths = await server
            .strictReceivePaths([Asset.native()], destAsset, String(destAmount))
            .call();

        if (!paths.records.length) {
            return res.status(404).json({ error: 'No swap route found. There may be insufficient liquidity.' });
        }

        const best = paths.records.reduce((a, b) =>
            parseFloat(a.source_amount) < parseFloat(b.source_amount) ? a : b
        );

        const sourceAmount = best.source_amount;
        if (!(parseFloat(sourceAmount) > 0)) {
            return res.status(500).json({ error: 'Failed to fetch swap quote' });
        }

        res.json({
            sourceAsset: 'XLM',
            sourceAmount,
            destAsset: destAssetCode,
            destAmount: String(destAmount),
            path: best.path.map(a => a.asset_code || 'XLM'),
            exchangeRate: (parseFloat(destAmount) / parseFloat(sourceAmount)).toFixed(7),
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch swap quote' });
    }
};
