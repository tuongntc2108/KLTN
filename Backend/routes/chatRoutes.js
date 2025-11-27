const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

/**
 * POST /api/chat
 * Body: { message: string, sessionId?: string }
 */
router.post('/', chatController.chat);

module.exports = router;
