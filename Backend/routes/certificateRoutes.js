const express = require("express");
const router = express.Router();
const certificateController = require("../controllers/certificateController");

// POST /api/certificates
router.post("/", certificateController.mintCertificate);

// POST /api/certificates/seed (Development only)
router.post("/seed", certificateController.seedTestCertificates);

// GET /api/certificates/issuer/:issuerId (put specific routes before parameterized ones)
router.get("/issuer/:issuerId", certificateController.getCertificatesByIssuer);

// GET /api/certificates/:id
router.get("/:id", certificateController.getCertificateById);

// PUT /api/certificates/:id/revoke
router.put("/:id/revoke", certificateController.revokeCertificate);

// PUT /api/certificates/:id/replace
router.put("/:id/replace", certificateController.replaceCertificate);

module.exports = router;
