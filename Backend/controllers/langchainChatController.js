const { OpenAIEmbeddings } = require('@langchain/openai');
const PostgreSQLVectorStore = require('../rag/vectorStore');
const RAGChainService = require('../rag/ragChain');
const { Pool } = require('pg');
const db = require('../config/pg');
const { randomUUID } = require('crypto');

/**
 * LangChain Chat Controller
 * Handles chat requests using the new LangChain RAG implementation
 */
class LangChainChatController {
  constructor() {
    // Initialize components
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    this.ragChainService = new RAGChainService({
      modelName: 'gpt-3.5-turbo'
    });
    this.pool = db.pool;
  }

  /**
   * Handle chat request using LangChain RAG
   */
  chat = async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { question, message, sessionId } = req.body;  // Accept both question and message

      // Support both 'question' and 'message' field names for compatibility
      const userQuestion = question || message;
      console.log('\n💬 [CHAT] Incoming chat request:');
      console.log(`   Session ID: ${sessionId}`);
      console.log(`   User: ${req.user?.email || 'anonymous'}`);
      
      if (!userQuestion || typeof userQuestion !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Question is required and must be a string' 
        });
      }

      // Generate or use provided session ID
      const currentSessionId = sessionId || this.generateSessionId();
      
      // Get user information from request (if authenticated)
      const userEmail = req.user?.email || null;
      const userRole = req.user?.role || 'anonymous';

      // Initialize vector store
      console.log('🗄️  [CHAT] Initializing vector store...');
      const vectorStore = PostgreSQLVectorStore.fromEmbeddings(
        this.embeddings,
        { pool: this.pool }
      );

      // Execute RAG chain to get response
      console.log('🔄 [CHAT] Executing RAG chain...');
      const response = await this.ragChainService.executeRAG(vectorStore, userQuestion);
      console.log('🏁 [CHAT] RAG execution completed, sending response to client');

      // Get relevant documents for context tracking
      const relevantDocs = await this.ragChainService.getRelevantDocuments(vectorStore, userQuestion, 5);
      const responseTime = Date.now() - startTime;

      // Prepare context documents for storage
      const contextDocuments = relevantDocs.map(doc => ({
        id: doc.metadata.id,
        title: doc.metadata.title,
        sourceFile: doc.metadata.sourceFile,
        similarity: doc.metadata.similarityScore || 0
      }));

      // Store conversation in database
      await this.saveConversation({
        sessionId: currentSessionId,
        userEmail,
        userRole,
        userMessage: userQuestion,
        botResponse: response,
        contextDocuments,
        responseTime
      });

      // Send response - format to match frontend expectations
      res.json({
        success: true,
        data: {
          answer: response,
          sessionId: currentSessionId,
          responseTime,
          sources: contextDocuments
        }
      });

    } catch (error) {
      console.error('LangChainChatController.chat error:', error);
      
      const errorResponse = 'Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn.';
      const responseTime = Date.now() - startTime;
      const fallbackSessionId = req.body.sessionId || this.generateSessionId();
      
      // Still try to save the error conversation
      try {
        await this.saveConversation({
          sessionId: fallbackSessionId,
          userEmail: req.user?.email || null,
          userRole: req.user?.role || 'anonymous',
          userMessage: req.body.question || req.body.message || '',
          botResponse: errorResponse,
          contextDocuments: [],
          responseTime
        });
      } catch (saveError) {
        console.error('Error saving error conversation:', saveError);
      }

      res.status(500).json({
        success: false,
        message: errorResponse,
        data: {
          answer: errorResponse,
          sessionId: fallbackSessionId
        }
      });
    }
  }

  /**
   * Generate new session ID
   */
  generateSessionId = () => {
    return randomUUID();
  }

  /**
   * Save conversation to database
   */
  saveConversation = async (conversationData) => {
    try {
      const query = `
        INSERT INTO chatbot_conversations (
          session_id, user_email, user_role, user_message, 
          bot_response, context_documents, response_time_ms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
      `;

      const values = [
        conversationData.sessionId,
        conversationData.userEmail,
        conversationData.userRole,
        conversationData.userMessage,
        conversationData.botResponse,
        JSON.stringify(conversationData.contextDocuments),
        conversationData.responseTime
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Don't throw error for conversation saving failure to avoid breaking the chat flow
    }
  }
}

module.exports = new LangChainChatController();