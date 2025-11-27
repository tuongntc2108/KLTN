const ChatService = require('../services/chatService');

const chatService = new ChatService();

class ChatController {
  async chat(req, res) {
    try {
      const { message, sessionId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, message: 'Message is required' });
      }

      const result = await chatService.handleChat({ message, sessionId });

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('ChatController.chat error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new ChatController();
