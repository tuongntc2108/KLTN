const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { requireRole } = require("../middlewares/authMiddleware");

// POST /api/students (Issuer, Admin)
router.post("/", requireRole(["Issuer", "Admin"]), studentController.createStudent);

// GET Students
router.get("/", requireRole(["Issuer", "Admin"]), studentController.getStudents);

// UPDATE Student
router.put("/:id", requireRole(["Issuer", "Admin"]), studentController.updateStudent);

module.exports = router;


