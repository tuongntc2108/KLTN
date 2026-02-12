const express = require("express");
const { authenticate, requireRole } = require("../middlewares/authMiddleware");
const issuerController = require("../controllers/issuerController");

const router = express.Router();

router.post("/", authenticate, requireRole(["Admin"]), issuerController.addIssuer);
router.get("/", authenticate, requireRole(["Admin"]), issuerController.getIssuers);

module.exports = router;
