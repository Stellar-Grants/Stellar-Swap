const {
    Keypair,
    Horizon,
    SorobanRpc,
    StrKey,
    TransactionBuilder,
    Asset,
    Operation,
    LiquidityPoolAsset,
    getLiquidityPoolId,
    BASE_FEE,
    Networks
} = require('@stellar/stellar-sdk');


exports.welcomeMsg = async (req, res) => {
    res.status(200).json({ message: "Welcome to Nexus Swap!" });
};

exports.generateKeyPair = async (req, res) => {
    const keypair = Keypair.random();
    res.json({
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret()
    });
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
    const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');

    try {
        const keypair = Keypair.fromSecret(secretKey);
        const account = await server.getAccount(keypair.publicKey());

        const asset = new Asset(tokenName, keypair.publicKey());
        const liquidityPoolAsset = new LiquidityPoolAsset(Asset.native(), asset, 30);
        const liquidityPoolId = getLiquidityPoolId('constant_product', liquidityPoolAsset).toString('hex');


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
                minPrice: { n: 1, d: 1 },
                maxPrice: { n: 1, d: 1 }
            }))
            .setTimeout(30)
            .build();

        depositTransaction.sign(keypair);
        const result = await server.sendTransaction(depositTransaction);

        res.json({ message: 'Deposit successful', asset, liquidityPoolId, transactionHash: result });
    } catch (error) {
        res.status(500).json({ error: `Error depositing tokens: ${error.message}` });
    }
};

exports.withdrawTokens = async (req, res) => {
    const { secretKey, liquidityPoolId, amount } = req.body;
    const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');

    try {
        const keypair = Keypair.fromSecret(secretKey);
        const account = await server.getAccount(keypair.publicKey());

        const withdrawTransaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET
        })
            .addOperation(Operation.liquidityPoolWithdraw({
                liquidityPoolId: liquidityPoolId,
                amount: amount,
                minAmountA: '0',
                minAmountB: '0'
            }))
            .setTimeout(30)
            .build();

        withdrawTransaction.sign(keypair);
        const result = await server.sendTransaction(withdrawTransaction);

        res.json({ message: 'Withdrawal successful', transactionHash: result});
    } catch (error) {
        res.status(500).json({ error: `Error withdrawing tokens: ${error.message}` });
    }
};

exports.getSwapQuote = async (req, res) => {
    const { destAssetCode, issuerAddress, destAmount } = req.body;

    const errors = [
        destAssetCode ? null : "destAssetCode is required",
        issuerAddress ? null : "issuerAddress is required",
        destAmount && parseFloat(destAmount) > 0 ? null : "destAmount must be a positive number",
    ].filter(Boolean);
    if (errors.length) return res.status(400).json({ errors });

    const server = new Horizon.Server(process.env.HORIZON_URL || "https://horizon-testnet.stellar.org");
    const destAsset = new Asset(destAssetCode, issuerAddress);

    try {
        const paths = await server
            .strictReceivePaths(Asset.native(), destAsset, destAmount)
            .call();

        if (!paths.records.length) {
            return res.status(404).json({ error: "No swap route found. There may be insufficient liquidity." });
        }

        const best = paths.records.reduce((a, b) =>
            parseFloat(a.source_amount) < parseFloat(b.source_amount) ? a : b
        );

        res.json({
            sourceAsset: "XLM",
            sourceAmount: best.source_amount,
            destAsset: destAssetCode,
            destAmount,
            path: best.path.map((a) => a.asset_code || "XLM"),
            exchangeRate: (parseFloat(destAmount) / parseFloat(best.source_amount)).toFixed(7),
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch swap quote" });
    }
};

exports.swapTokens = async (req, res) => {
    const { secretKey, destAssetCode, issuerAddress, sendMax, destAmount } = req.body;
    const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');

    try {
        const keypair = Keypair.fromSecret(secretKey);
        const account = await server.getAccount(keypair.publicKey());
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
        const result = await server.sendTransaction(swapTransaction);

        res.json({ message: 'Swap successful', transactionHash: result});
    } catch (error) {
        res.status(500).json({ error: `Error performing swap: ${error.message}` });
    }
};
