const express = require("express");
const router = express.Router();
const certificateController = require("../controllers/certificateController");

// POST /api/certificates
router.post("/", certificateController.mintCertificate);

// GET /api/certificates/:id
router.get("/:id", certificateController.getCertificateById);

// PUT /api/certificates/:id/revoke
router.put("/:id/revoke", certificateController.revokeCertificate);

module.exports = router;
