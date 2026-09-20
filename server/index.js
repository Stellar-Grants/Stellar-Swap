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

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        // Origin-less requests are non-browser clients such as curl, Postman,
        // health checks, and server-to-server integrations.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS policy: origin ${origin} is not allowed.`), false);
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
};

app.disable("x-powered-by");

// Security headers must be the first registered middleware so every route,
// including error responses from later middleware, receives the same baseline.
app.use(helmet({
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    frameguard: { action: "deny" },
    noSniff: true,
    hidePoweredBy: true,
    referrerPolicy: { policy: "no-referrer" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'none'"],
            formAction: ["'none'"],
        },
    },
}));

// This API handles key and transaction material. Responses should never be
// retained by browsers, shared proxies, or CDNs, even when a sensitive route
// is renamed or moved.
app.use((_req, res, next) => {
    res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    next();
});

app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/", tokenRoute);

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
