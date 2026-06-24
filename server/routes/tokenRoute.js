const express = require("express");
const tokenController = require("../controllers/tokenControllers");
const router = express.Router();

const multer = require("multer");
const storage = multer.diskStorage({});
const upload = multer({
    storage,
    limits: {
        fieldSize: 10 * 1024 * 1024,
    },
});
router
    .get("/", tokenController.welcomeMsg)
    .get("/account-history/:publicKey", tokenController.getAccountHistory)
    .post("/fund-account", tokenController.fundAccount)
    .post("/deposit-tokens",tokenController.depositTokens)
    .post("/withdraw-tokens",tokenController.withdrawTokens)
    .post("/swap-tokens",tokenController.swapTokens)
    .post("/swap-quote", tokenController.getSwapQuote)
    .get('/account-info/:publicKey', tokenController.getAccountInfo)

module.exports = router;
