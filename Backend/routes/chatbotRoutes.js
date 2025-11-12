const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route POST /api/chatbot/chat
 * @desc Send message to chatbot and get AI response
 * @access Public (works for both authenticated and anonymous users)
 */
router.post('/chat', chatbotController.chat);

/**
 * @route GET /api/chatbot/health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/health', chatbotController.healthCheck);

module.exports = router;