const { OpenAIEmbeddings } = require('@langchain/openai');
const PostgreSQLVectorStore = require('../rag/vectorStore');
const RAGChainService = require('../rag/ragChain');
const { Pool } = require('pg');
const db = require('../config/pg');
const { randomUUID } = require('crypto');
const http = require('http');
const https = require('https');

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
    
    // Create RAG chain services for both authenticated and non-authenticated users
    this.ragChainServiceUnauthenticated = new RAGChainService({
      modelName: 'gpt-3.5-turbo'
    });
    
    // Create a modified RAG chain service for authenticated users with different fallback message
    this.ragChainServiceAuthenticated = new RAGChainService({
      modelName: 'gpt-3.5-turbo',
      authenticatedFlow: true
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
      
      // Check if user is authenticated
      console.log('\n=== AUTHENTICATION CHECK ===');
      console.log('👤 [AUTH] Request user object:', req.user ? 'Present' : 'NULL/Undefined');
      console.log('👤 [AUTH] Request cookies:', Object.keys(req.cookies || {}));
      console.log('👤 [AUTH] Request headers authorization:', !!req.headers.authorization);
      
      if (req.user) {
        console.log('👤 [AUTH] User details - Email:', req.user.email, '| Role:', req.user.role);
      } else {
        console.log('👤 [AUTH] No user found in request');
        // Check if auth_token cookie exists but wasn't processed
        if (req.cookies?.auth_token) {
          console.log('⚠️  [AUTH] auth_token cookie found but req.user is null - middleware issue');
        }
      }
      
      const isUserAuthenticated = !!req.user;
      console.log('👤 [AUTH] Is authenticated:', isUserAuthenticated);
      const userEmail = req.user?.email || null;
      const userRole = req.user?.role || 'anonymous';
      console.log('=== END AUTH CHECK ===\n');

      // Initialize vector store
      console.log('🗄️  [CHAT] Initializing vector store...');
      const vectorStore = PostgreSQLVectorStore.fromEmbeddings(
        this.embeddings,
        { pool: this.pool }
      );

      // Execute RAG chain to get response based on authentication status
      console.log(isUserAuthenticated ? '\n🔄 [CHAT] Executing RAG chain for AUTHENTICATED user...' : '\n🔄 [CHAT] Executing RAG chain for NON-AUTHENTICATED user...');
      
      // Use different RAG services based on authentication status
      const ragService = isUserAuthenticated ? this.ragChainServiceAuthenticated : this.ragChainServiceUnauthenticated;
      console.log('🔄 [SERVICE] Using', isUserAuthenticated ? 'authenticated' : 'non-authenticated', 'RAG service');
      const response = await ragService.executeRAG(vectorStore, userQuestion);
      console.log('🏁 [CHAT] RAG execution completed, sending response to client');

      // For authenticated users, if the response contains the support message, trigger webhook
      let needsWebhookCall = false;
      
      if (isUserAuthenticated && response.includes('tư vấn viên')) {
        needsWebhookCall = true;
      }
      
      const finalResponse = response;

      // Get relevant documents for context tracking
      // Use the same service instance that was used for the response
      const ragServiceUsed = isUserAuthenticated ? this.ragChainServiceAuthenticated : this.ragChainServiceUnauthenticated;
      const relevantDocs = await ragServiceUsed.getRelevantDocuments(vectorStore, userQuestion, 5);
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
        botResponse: finalResponse,
        contextDocuments,
        responseTime
      });

      // If user is authenticated and needs webhook call, trigger it
      if (needsWebhookCall) {
        try {
          await this.sendSupportNotification({
            event_type: 'chatbot_support_request',
            question: userQuestion,
            userId: req.user?.email,
            sessionId: currentSessionId,
            timestamp: new Date().toISOString(),
            userRole: req.user?.role
          });
          console.log('📤 Support notification sent to n8n successfully');
        } catch (webhookError) {
          console.error('❌ Error sending support notification to n8n:', webhookError.message);
        }
      }

      // Send response - format to match frontend expectations
      res.json({
        success: true,
        data: {
          answer: finalResponse,
          sessionId: currentSessionId,
          responseTime,
          sources: contextDocuments
        }
      });

    } catch (error) {
      console.error('LangChainChatController.chat error:', error);
      
      const isUserAuthenticated = !!req.user;
      let errorResponse = 'Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn.';
      
      // If user is authenticated, change the error response
      if (isUserAuthenticated) {
        errorResponse = 'Tôi không rõ thông tin này, câu hỏi đã được gửi đến tư vấn viên. Vui lònng chờ phản hồi qua email';
      }
      
      const responseTime = Date.now() - startTime;
      const fallbackSessionId = req.body.sessionId || this.generateSessionId();
      
      // Still try to save the error conversation
      try {
        // In error case, we might not have a valid vector store, so use empty context
        let contextDocuments = [];
        
        // Only try to get relevant documents if vectorStore was initialized
        if (typeof vectorStore !== 'undefined' && vectorStore !== null) {
          try {
            const ragServiceUsed = isUserAuthenticated ? this.ragChainServiceAuthenticated : this.ragChainServiceUnauthenticated;
            const relevantDocs = await ragServiceUsed.getRelevantDocuments(vectorStore, req.body.question || req.body.message || '', 5);
            contextDocuments = relevantDocs.map(doc => ({
              id: doc.metadata.id,
              title: doc.metadata.title,
              sourceFile: doc.metadata.sourceFile,
              similarity: doc.metadata.similarityScore || 0
            }));
          } catch (docError) {
            console.error('Error getting relevant documents for error case:', docError.message);
            contextDocuments = []; // fallback to empty array
          }
        }
        
        await this.saveConversation({
          sessionId: fallbackSessionId,
          userEmail: req.user?.email || null,
          userRole: req.user?.role || 'anonymous',
          userMessage: req.body.question || req.body.message || '',
          botResponse: errorResponse,
          contextDocuments,
          responseTime
        });
      } catch (saveError) {
        console.error('Error saving error conversation:', saveError);
      }

      // If user is authenticated and error occurred, trigger webhook
      if (isUserAuthenticated) {
        try {
          await this.sendSupportNotification({
            event_type: 'chatbot_error_support_request',
            question: req.body.question || req.body.message || '',
            userId: req.user?.email,
            sessionId: fallbackSessionId,
            timestamp: new Date().toISOString(),
            userRole: req.user?.role,
            error: true,
            errorMessage: error.message
          });
          console.log('📤 Support notification sent to n8n successfully for error case');
        } catch (webhookError) {
          console.error('❌ Error sending support notification to n8n:', webhookError.message);
        }
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

  /**
   * Send notification to n8n webhook for support requests
   * @param {Object} notificationData - Data to send to n8n webhook
   * @returns {Promise<boolean>} - Returns true if notification sent successfully
   */
  async sendSupportNotification(notificationData) {
    try {
      console.log('📤 Sending support notification via n8n webhook:', notificationData);
      
      const N8N_WEBHOOK_URL_SUPPORT = process.env.N8N_WEBHOOK_URL_SUPPORT;
      
      if (!N8N_WEBHOOK_URL_SUPPORT) {
        console.error('❌ N8N_WEBHOOK_URL_SUPPORT not configured');
        return false;
      }
      
      const payload = JSON.stringify(notificationData);
      const webhookUrl = new URL(N8N_WEBHOOK_URL_SUPPORT);
      
      // Choose http or https module based on protocol
      const protocol = webhookUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: webhookUrl.hostname,
        port: webhookUrl.port || (webhookUrl.protocol === 'https:' ? 443 : 80),
        path: webhookUrl.pathname + webhookUrl.search,
        method: 'GET', 
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      console.log('🔧 Request options:', options);

      return new Promise((resolve, reject) => {
        const req = protocol.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            console.log('✅ Support notification sent successfully:', res.statusCode);
            console.log('📥 Response:', data);
            resolve(true);
          });
        });

        req.on('error', (error) => {
          console.error('❌ Failed to send support notification:', error.message);
          resolve(false);
        });

        req.write(payload);
        req.end();
      });
    } catch (error) {
      console.error('❌ Failed to send support notification:', error.message);
      return false;
    }
  }
}

module.exports = new LangChainChatController();