const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const tokenRoute = require("./routes/tokenRoute");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const app = express();

app.disable('x-powered-by');

app.use(helmet({
    // Force HTTPS with HSTS (1 year)
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Prevent MIME type sniffing
    noSniff: true,
    // Remove X-Powered-By header
    hidePoweredBy: true,
    // Referrer policy — don't leak URLs
    referrerPolicy: { policy: 'no-referrer' },
    // Content Security Policy (strict for an API — no HTML served)
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
        },
    },
}));

// Defense-in-depth: this API handles Stellar secret keys, so responses
// must never be cached by proxies/CDNs.
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

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

start();