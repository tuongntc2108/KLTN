const express = require("express");
const router = express.Router();
const certificateController = require("../controllers/certificateController");
const { authenticate, requireRole } = require("../middlewares/authMiddleware");

// POST /api/certificates (Issuer, Admin only)
router.post("/", authenticate, requireRole(["Issuer", "Admin"]), certificateController.mintCertificate);

// GET /api/certificates/my (authenticated students get their own certificates)
router.get("/my", authenticate, certificateController.getMyCertificates);

// GET /api/certificates/all (get all certificates in the system)
router.get("/all", authenticate, requireRole(["Issuer", "Admin"]), certificateController.getAllCertificates);

/*
// GET /api/certificates/issuer/:issuerId (put specific routes before parameterized ones)
router.get("/issuer/:issuerId", authenticate, requireRole(["Issuer", "Admin"]), certificateController.getCertificatesByIssuer);
*/

// GET /api/certificates/:id (authenticated users only)
router.get("/:id", authenticate, certificateController.getCertificateById);

// GET /api/certificates/:id/ai-summary (public access for verification page)
router.get("/:id/ai-summary", certificateController.getAISummary);

// POST /api/certificates/:id/claim (authenticated students only)
router.post("/:id/claim", authenticate, certificateController.claimCertificate);

// POST /api/certificates/:id/sync-status (authenticated students only)
router.post("/:id/sync-status", authenticate, certificateController.syncCertificateStatus);

// PUT /api/certificates/:id/revoke (Issuer, Admin only)
router.put("/:id/revoke", authenticate, requireRole(["Issuer", "Admin"]), certificateController.revokeCertificate);

// PUT /api/certificates/:id/replace (Issuer, Admin only)
router.put("/:id/replace", authenticate, requireRole(["Issuer", "Admin"]), certificateController.replaceCertificate);

module.exports = router;
