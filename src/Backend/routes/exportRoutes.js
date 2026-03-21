const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

// GET /api/export (Admin, Issuer only)
router.get(
  '/', 
  authenticate, 
  requireRole(['Admin', 'Issuer']), 
  exportController.exportData
);

module.exports = router;
