const express = require('express');
const router = express.Router();
const langchainChatController = require('../controllers/langchainChatController');

/**
 * POST /chat
 * Input: { "question": "..." }
 * Output: { "success": boolean, "answer": "...", "sessionId": "..." }
 */
router.post('/', langchainChatController.chat);

module.exports = router;