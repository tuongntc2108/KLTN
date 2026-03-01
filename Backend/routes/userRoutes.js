const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

/**
 * GET /api/users/profile
 * Get full user profile with role-specific information
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * PUT /api/users/language
 * Update user language preference
 * Body: { language: 'vi' | 'en' }
 */
router.put('/language', authenticate, userController.updateLanguage);

/**
 * PUT /api/users/avatar
 * Upload and update user avatar
 * Form-data: avatar (file)
 */
router.put('/avatar', authenticate, userController.uploadMiddleware, userController.updateAvatar);

module.exports = router;
