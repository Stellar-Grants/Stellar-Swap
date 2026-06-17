const {
    Keypair,
    SorobanRpc,
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