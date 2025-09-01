const express = require("express");
const router = express.Router();
const verifyController = require("../controllers/verifyController");

router.get("/by-code/:verificationCode", verifyController.verifyByCode);
router.get("/by-token/:tokenId", verifyController.verifyByTokenId);

module.exports = router;
