const { Pool } = require('pg');
const db = require('../config/pg');

/**
 * Conversation Memory Service
 * Handles loading and formatting recent conversation history for context
 */
class ConversationMemoryService {
  constructor() {
    this.pool = db.pool;
    this.defaultNumTurns = 3; // Default: load 3 recent turns (3 Q&A pairs)
  }

  /**
   * Get recent conversation turns for a session
   * @param {string} sessionId - Session ID (UUID)
   * @param {number} numTurns - Number of turns to retrieve, default 3
   * @returns {Promise<Array>} Array of {user_message, bot_response, created_at}
   */
  async getRecentConversations(sessionId, numTurns = this.defaultNumTurns) {
    try {
      console.log(`💬 [MEMORY] Loading ${numTurns} recent turns for session: ${sessionId.substring(0, 8)}...`);

      if (!sessionId) {
        console.warn('⚠️  [MEMORY] No session ID provided');
        return [];
      }

      const query = `
        SELECT 
          user_message,
          bot_response,
          created_at
        FROM chatbot_conversations
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [sessionId, numTurns]);
      
      // Reverse to get chronological order (oldest to newest)
      const conversations = result.rows.reverse();
      
      console.log(`✅ [MEMORY] Retrieved ${conversations.length} turns`);
      conversations.forEach((conv, idx) => {
        const userPreview = conv.user_message.substring(0, 50);
        console.log(`   Turn ${idx + 1}: User: "${userPreview}..."`);
      });

      return conversations;
    } catch (error) {
      console.error('❌ [MEMORY] Error loading conversations:', error.message);
      return [];
    }
  }

  /**
   * Format conversation history for injection into LLM prompt
   * Converts to readable string with role prefixes
   * @param {Array} conversations - Array from getRecentConversations
   * @param {number} maxTokensPerTurn - Truncate each turn if it exceeds this, default 300
   * @returns {string} Formatted conversation history string
   */
  formatConversationHistory(conversations, maxTokensPerTurn = 300) {
    if (!Array.isArray(conversations) || conversations.length === 0) {
      console.log('📭 [MEMORY FORMAT] No conversation history to format');
      return '';
    }

    console.log(`📝 [MEMORY FORMAT] Formatting ${conversations.length} turns, max ${maxTokensPerTurn} chars per turn`);

    const formatted = conversations.map((conv, idx) => {
      const userMsg = this.truncateMessage(conv.user_message, maxTokensPerTurn);
      const botMsg = this.truncateMessage(conv.bot_response, maxTokensPerTurn);
      
      return `Turn ${idx + 1}:
User: ${userMsg}
Assistant: ${botMsg}`;
    }).join('\n\n');

    return formatted;
  }

  /**
   * Truncate message to approximate token count
   * Rough approximation: 1 token ≈ 4 characters
   * @param {string} message - Message to truncate
   * @param {number} maxChars - Max characters
   * @returns {string} Truncated message
   */
  truncateMessage(message, maxChars = 300) {
    if (!message) return '(no message)';
    
    if (message.length <= maxChars) {
      return message;
    }

    return message.substring(0, maxChars).trim() + '...';
  }

  /**
   * Format conversation history for structured message array (for some LLM APIs)
   * @param {Array} conversations - Array from getRecentConversations
   * @returns {Array<{role: string, content: string}>} Structured format
   */
  formatAsMessageArray(conversations) {
    if (!Array.isArray(conversations) || conversations.length === 0) {
      return [];
    }

    const messages = [];
    conversations.forEach((conv) => {
      messages.push({
        role: 'user',
        content: conv.user_message
      });
      messages.push({
        role: 'assistant',
        content: conv.bot_response
      });
    });

    return messages;
  }

  /**
   * Check if session has context (at least one previous conversation)
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} True if session has history
   */
  async hasConversationHistory(sessionId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM chatbot_conversations
        WHERE session_id = $1
      `;

      const result = await this.pool.query(query, [sessionId]);
      const hasHistory = result.rows[0].count > 0;
      
      console.log(`📊 [MEMORY CHECK] Session has history: ${hasHistory}`);
      return hasHistory;
    } catch (error) {
      console.error('❌ [MEMORY CHECK] Error:', error.message);
      return false;
    }
  }

  /**
   * Clear conversation history for a session (for privacy/reset)
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} True if successful
   */
  async clearSessionHistory(sessionId) {
    try {
      console.log(`🗑️  [MEMORY] Clearing history for session: ${sessionId.substring(0, 8)}...`);

      const query = `
        DELETE FROM chatbot_conversations
        WHERE session_id = $1
      `;

      const result = await this.pool.query(query, [sessionId]);
      console.log(`✅ [MEMORY] Deleted ${result.rowCount} conversations`);

      return true;
    } catch (error) {
      console.error('❌ [MEMORY] Error clearing history:', error.message);
      return false;
    }
  }

  /**
   * Get session summary (total turns, first & last message date)
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Session summary or null
   */
  async getSessionSummary(sessionId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_turns,
          MIN(created_at) as first_message_at,
          MAX(created_at) as last_message_at
        FROM chatbot_conversations
        WHERE session_id = $1
      `;

      const result = await this.pool.query(query, [sessionId]);
      const summary = result.rows[0];

      if (summary.total_turns === 0) {
        return null;
      }

      console.log(`📊 [MEMORY SUMMARY] Session has ${summary.total_turns} turns`);
      return {
        sessionId,
        totalTurns: parseInt(summary.total_turns),
        firstMessageAt: summary.first_message_at,
        lastMessageAt: summary.last_message_at
      };
    } catch (error) {
      console.error('❌ [MEMORY SUMMARY] Error:', error.message);
      return null;
    }
  }
}

module.exports = new ConversationMemoryService();
