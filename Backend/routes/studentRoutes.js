const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { authenticate, requireRole } = require("../middlewares/authMiddleware");

// POST /api/students (Issuer, Admin)
router.post("/", authenticate, requireRole(["Issuer", "Admin"]), studentController.createStudent);

// GET Students
router.get("/", authenticate, requireRole(["Issuer", "Admin"]), studentController.getStudents);

// GET Student by ID (for certificate issuance)
router.get("/:id", authenticate, requireRole(["Issuer", "Admin"]), studentController.getStudentById);

// UPDATE Student
router.put("/:id", authenticate, requireRole(["Issuer", "Admin"]), studentController.updateStudent);

// DELETE Student
router.delete("/:id", authenticate, requireRole(["Issuer", "Admin"]), studentController.deleteStudent);

// New routes for wallet management
// GET current user's wallet info (for authenticated students)
router.get("/me/wallet", authenticate, studentController.getMyWalletInfo);

// UPDATE current user's wallet address (for authenticated students)
router.patch("/me/wallet", authenticate, studentController.updateWalletAddress);

module.exports = router;


