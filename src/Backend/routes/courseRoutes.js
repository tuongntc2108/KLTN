// routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { authenticate, requireRole } = require("../middlewares/authMiddleware");

// All course routes require Issuer or Admin authentication
const requireIssuerAuth = [authenticate, requireRole(["Issuer", "Admin"])];

// POST /api/courses - Create new course
router.post("/", requireIssuerAuth, courseController.createCourse);

// GET /api/courses - Get all courses for current issuer
router.get("/", requireIssuerAuth, courseController.getCourses);

// GET /api/courses/:id - Get specific course by ID
router.get("/:id", requireIssuerAuth, courseController.getCourseById);

// PUT /api/courses/:id - Update course
router.put("/:id", requireIssuerAuth, courseController.updateCourse);

// DELETE /api/courses/:id - Delete course
router.delete("/:id", requireIssuerAuth, courseController.deleteCourse);

module.exports = router;