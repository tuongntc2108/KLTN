const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/dashboardController')
const { authenticate } = require('../middlewares/authMiddleware')

// Áp dụng middleware authentication cho tất cả routes
router.use(authenticate)

// GET /api/dashboard/stats - Lấy thống kê tổng quan
router.get('/stats', dashboardController.getStats)

// GET /api/dashboard/recent-certificates - Lấy chứng chỉ gần đây
router.get('/recent-certificates', dashboardController.getRecentCertificates)

// GET /api/dashboard/recent-students - Lấy học viên mới tạo
router.get('/recent-students', dashboardController.getRecentStudents)

module.exports = router