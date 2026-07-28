const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const tokenRoute = require("./routes/tokenRoute");
const cors = require("cors");
const dotenv = require("dotenv");
const { validateEnv } = require("./utils/validateEnv");
dotenv.config();
const app = express();

function checkEnv() {
    const { errors, warnings } = validateEnv();

    if (warnings.length > 0) {
        console.warn('[Config] Warnings:\n' + warnings.map(w => `  ⚠ ${w}`).join('\n'));
    }

    if (errors.length > 0) {
        console.error('[Config] Fatal errors — server cannot start:\n' + errors.map(e => `  ✗ ${e}`).join('\n'));
        process.exit(1);
    }

    console.log('[Config] Environment validated successfully.');
}

const corsOptions = {
    origin: '*',
    methods: 'GET, POST, PUT, DELETE, OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
};

app.use(morgan("dev"));
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/', tokenRoute);

const port = process.env.PORT || 8000;

const start = async () => {
    try {
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (err) {
        console.log(err);
    }
};

checkEnv();
start();