const express = require('express');
const router = express.Router();
const langchainChatController = require('../controllers/langchainChatController');
const { optionalAuthenticate } = require('../middlewares/authMiddleware');

/**
 * POST /chat
 * Input: { "question": "..." }
 * Output: { "success": boolean, "answer": "...", "sessionId": "..." }
 */
router.post('/', optionalAuthenticate, langchainChatController.chat);

module.exports = router;