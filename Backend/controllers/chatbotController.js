const ChatbotService = require('../services/chatbotService');

const chatbotService = new ChatbotService();

class ChatbotController {
    async chat(req, res) {
        try {
            const { message, sessionId } = req.body;

            if (!message) {
                return res.status(400).json({ error: 'Message is required' });
            }

            const userEmail = req.user?.email || null;
            const userRole = req.user?.role || 'anonymous';
            const currentSessionId = sessionId || chatbotService.generateSessionId();

            const response = await chatbotService.generateResponse(
                message,
                currentSessionId,
                userEmail,
                userRole
            );

            res.json({
                success: true,
                message: response.response,
                sessionId: currentSessionId
            });

        } catch (error) {
            console.error('Chat error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Xin lỗi, có lỗi xảy ra.'
            });
        }
    }

    async healthCheck(req, res) {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = new ChatbotController();
