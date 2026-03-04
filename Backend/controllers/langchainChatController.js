const { OpenAIEmbeddings } = require('@langchain/openai');
const PostgreSQLVectorStore = require('../rag/vectorStore');
const RAGChainService = require('../rag/ragChain');
const { classifyUnifiedQuery } = require('../rag/metadataClassification');
const CourseContentService = require('../services/courseContentService');
const ConversationMemoryService = require('../services/conversationMemoryService');
const CourseAnswerGenerator = require('../services/courseAnswerGenerator');
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

    // 🆕 Create course answer generators for both flows
    this.courseAnswerGeneratorUnauthenticated = new CourseAnswerGenerator({
      modelName: 'gpt-3.5-turbo',
      authenticatedFlow: false
    });

    this.courseAnswerGeneratorAuthenticated = new CourseAnswerGenerator({
      modelName: 'gpt-3.5-turbo',
      authenticatedFlow: true
    });
    
    this.pool = db.pool;
  }

  /**
   * 🆕 Execute unified classification (2-call architecture, Call #1)
   * Classify question into topic + extract course mentions
   */
  async executeUnifiedClassification(question) {
    try {
      console.log('\n=== UNIFIED CLASSIFICATION (Call #1) ===');
      const classification = await classifyUnifiedQuery(question);
      console.log('📊 [CLASSIFICATION] Result:', classification);
      return classification;
    } catch (error) {
      console.error('❌ [CLASSIFICATION] Error:', error.message);
      // Fallback to basic classification
      return {
        topic: 'support',
        user_role: 'all',
        course_name_mentions: [],
        confidence: 0.3
      };
    }
  }

  /**
   * 🆕 Execute course content flow (specialized for course queries)
   */
  async executeCourseContentFlow(userQuestion, classification, sessionId, isUserAuthenticated) {
    try {
      console.log('\n=== COURSE CONTENT FLOW ===');
      const { course_name_mentions, confidence } = classification;

      // Step 1: Fuzzy search for courses
      let matchedCourses = [];
      if (course_name_mentions.length > 0) {
        console.log(`🔍 [COURSE FLOW] Searching for mentioned courses: ${course_name_mentions.join(', ')}`);
        
        for (const mention of course_name_mentions) {
          const matches = await CourseContentService.fuzzySearchCourses(mention, 0.3, 5);
          matchedCourses.push(...matches);
        }

        // Remove duplicates based on course ID
        const uniqueCourses = Array.from(
          new Map(matchedCourses.map(c => [c.id, c])).values()
        );
        matchedCourses = uniqueCourses;
      } else if (confidence >= 0.75) {
        // No mentions but high confidence - try full question search
        console.log('⚠️  [COURSE FLOW] No mentions but high confidence, trying full question fuzzy search');
        matchedCourses = await CourseContentService.fuzzySearchCourses(userQuestion, 0.25, 5);
      }

      console.log(`✅ [COURSE FLOW] Found ${matchedCourses.length} course candidates`);

      // Step 2: Handle no candidates case
      if (matchedCourses.length === 0) {
        console.log('❌ [COURSE FLOW] No course found, returning fallback message');
        return {
          response: 'Xin lỗi, mình không tìm thấy khóa học phù hợp. Vui lòng cung cấp tên khóa học rõ hơn hoặc liên hệ với đơn vị đào tạo.',
          routing: 'course_content_no_match',
          courseCount: 0
        };
      }

      // Step 3: Load conversation memory
      console.log('💬 [COURSE FLOW] Loading conversation memory...');
      const conversations = await ConversationMemoryService.getRecentConversations(sessionId, 3);
      const conversationHistory = ConversationMemoryService.formatConversationHistory(conversations, 250);
      console.log(`✅ [COURSE FLOW] Loaded ${conversations.length} conversation turns`);

      // Step 4: Choose generator (auth vs non-auth)
      const generator = isUserAuthenticated ? 
        this.courseAnswerGeneratorAuthenticated : 
        this.courseAnswerGeneratorUnauthenticated;

      // Step 5: Generate answer using Call #2
      console.log(`\n=== LLM CALL #2 (Course Answer Generation) ===`);
      const multiple = matchedCourses.length > 1 && 
        matchedCourses[0].similarity_score - matchedCourses[1].similarity_score < 0.1; // Close similarity scores
      
      const courseAnswer = await generator.generateCourseContentAnswer(
        userQuestion,
        matchedCourses,
        conversationHistory,
        multiple
      );

      console.log('✅ [COURSE FLOW] Answer generated successfully');
      return {
        response: courseAnswer,
        routing: multiple ? 'course_content_disambiguation' : 'course_content_answer',
        courseCount: matchedCourses.length,
        topCourse: matchedCourses[0].id,
        courseNames: matchedCourses.map(c => c.course_name)
      };
    } catch (error) {
      console.error('❌ [COURSE FLOW] Error:', error.message);
      const fallback = isUserAuthenticated ?
        'Tôi không rõ thông tin này, câu hỏi đã được gửi đến tư vấn viên. Vui lòng chờ phản hồi qua email' :
        'Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn.';
      
      return {
        response: fallback,
        routing: 'course_content_error',
        courseCount: 0,
        error: error.message
      };
    }
  }

  /**
   * 🆕 Execute regular RAG flow (with memory context)
   */
  async executeRegularRagFlow(vectorStore, userQuestion, sessionId, isUserAuthenticated) {
    try {
      console.log('\n=== REGULAR RAG FLOW ===');

      // Load conversation memory for context
      console.log('💬 [RAG FLOW] Loading conversation memory...');
      const conversations = await ConversationMemoryService.getRecentConversations(sessionId, 3);
      const conversationHistory = ConversationMemoryService.formatConversationHistory(conversations, 250);
      console.log(`✅ [RAG FLOW] Loaded ${conversations.length} conversation turns`);

      // Execute RAG chain (existing flow, but with memory if available)
      console.log(`\n=== LLM CALL #2 (RAG Document Answer) ===`);
      const ragService = isUserAuthenticated ? 
        this.ragChainServiceAuthenticated : 
        this.ragChainServiceUnauthenticated;

      // TODO: Consider passing conversationHistory to RAG prompt
      // For now, keeping existing flow intact
      const response = await ragService.executeRAG(vectorStore, userQuestion);

      console.log('✅ [RAG FLOW] Answer generated successfully');
      return {
        response,
        routing: 'regular_rag',
        memoryLoaded: conversations.length > 0
      };
    } catch (error) {
      console.error('❌ [RAG FLOW] Error:', error.message);
      const fallback = isUserAuthenticated ?
        'Tôi không rõ thông tin này, câu hỏi đã được gửi đến tư vấn viên. Vui lòng chờ phản hồi qua email' :
        'Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn.';
      
      return {
        response: fallback,
        routing: 'rag_error',
        error: error.message
      };
    }
  }

  /**
   * 🆕 Router: decide which flow to execute
   */
  async routeQuery(classification, question, vectorStore, sessionId, isUserAuthenticated) {
    const { topic, confidence } = classification;

    console.log('\n=== ROUTING DECISION ===');
    console.log(`📍 [ROUTER] Topic: ${topic}, Confidence: ${confidence}`);

    if (topic === 'course_content_query' && confidence >= 0.5) {
      console.log('✅ [ROUTER] → COURSE CONTENT FLOW');
      return await this.executeCourseContentFlow(question, classification, sessionId, isUserAuthenticated);
    } else {
      console.log('✅ [ROUTER] → REGULAR RAG FLOW');
      return await this.executeRegularRagFlow(vectorStore, question, sessionId, isUserAuthenticated);
    }
  }

  /**
   * Handle chat request using 2-call architecture
   */
  chat = async (req, res) => {
    const startTime = Date.now();
    let routingMetadata = {};
    
    try {
      const { question, message, sessionId } = req.body;

      // Support both 'question' and 'message' field names
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
      
      // Auth check
      console.log('\n=== AUTHENTICATION CHECK ===');
      const isUserAuthenticated = !!req.user;
      const userEmail = req.user?.email || null;
      const userRole = req.user?.role || 'anonymous';
      console.log(`✅ [AUTH] Authenticated: ${isUserAuthenticated}, Email: ${userEmail}, Role: ${userRole}`);
      console.log('=== END AUTH CHECK ===\n');

      // ========== 🆕 UNIFIED CLASSIFICATION (Call #1) ==========
      const classification = await this.executeUnifiedClassification(userQuestion);
      routingMetadata.classification = classification;

      // Initialize vector store (needed for either flow)
      console.log('🗄️  [CHAT] Initializing vector store...');
      const vectorStore = PostgreSQLVectorStore.fromEmbeddings(
        this.embeddings,
        { pool: this.pool }
      );

      // ========== 🆕 ROUTER: Route to appropriate flow ==========
      const flowResult = await this.routeQuery(
        classification,
        userQuestion,
        vectorStore,
        currentSessionId,
        isUserAuthenticated
      );

      const finalResponse = flowResult.response;
      routingMetadata.routing = flowResult.routing;
      routingMetadata.courseInfo = {
        courseCount: flowResult.courseCount || 0,
        topCourse: flowResult.topCourse,
        courseNames: flowResult.courseNames || []
      };

      console.log('🏁 [CHAT] Flow completed, preparing response...');

      // Get relevant documents if it's a RAG flow (for context tracking)
      let contextDocuments = [];
      if (flowResult.routing === 'regular_rag') {
        try {
          const ragService = isUserAuthenticated ? 
            this.ragChainServiceAuthenticated : 
            this.ragChainServiceUnauthenticated;
          const relevantDocs = await ragService.getRelevantDocuments(vectorStore, userQuestion, 5);
          contextDocuments = relevantDocs.map(doc => ({
            id: doc.metadata.id,
            title: doc.metadata.title,
            sourceFile: doc.metadata.sourceFile,
            similarity: doc.metadata.similarityScore || 0
          }));
        } catch (error) {
          console.error('Warning: Could not get relevant documents:', error.message);
        }
      } else if (flowResult.routing.startsWith('course_content')) {
        // For course flows, add course info to sources
        contextDocuments = (flowResult.courseNames || []).map((name, idx) => ({
          id: name,
          title: name,
          sourceFile: 'course_database',
          similarity: 1.0,
          type: 'course'
        }));
      }

      const responseTime = Date.now() - startTime;

      // Store conversation in database
      await this.saveConversation({
        sessionId: currentSessionId,
        userEmail,
        userRole,
        userMessage: userQuestion,
        botResponse: finalResponse,
        contextDocuments,
        responseTime,
        routing: flowResult.routing,
        metadata: routingMetadata
      });

      // Check if webhook call needed (for authenticated users getting support message)
      let needsWebhookCall = false;
      if (isUserAuthenticated && finalResponse.includes('tư vấn viên')) {
        needsWebhookCall = true;
      }

      // If user is authenticated and needs webhook call, trigger it
      if (needsWebhookCall) {
        try {
          await this.sendSupportNotification({
            event_type: 'chatbot_support_request',
            question: userQuestion,
            userId: req.user?.email,
            sessionId: currentSessionId,
            timestamp: new Date().toISOString(),
            userRole: req.user?.role,
            routing: flowResult.routing,
            classification: classification
          });
          console.log('📤 Support notification sent to n8n successfully');
        } catch (webhookError) {
          console.error('❌ Error sending support notification to n8n:', webhookError.message);
        }
      }

      // Log telemetry
      console.log(`\n📊 [TELEMETRY] Response Time: ${responseTime}ms, Routing: ${flowResult.routing}, Confidence: ${classification.confidence}`);

      // Send response
      res.json({
        success: true,
        data: {
          answer: finalResponse,
          sessionId: currentSessionId,
          responseTime,
          sources: contextDocuments,
          routing: flowResult.routing
        }
      });

    } catch (error) {
      console.error('❌ [CHAT] Unhandled error:', error);
      
      const isUserAuthenticated = !!req.user;
      const errorResponse = isUserAuthenticated ?
        'Tôi không rõ thông tin này, câu hỏi đã được gửi đến tư vấn viên. Vui lòng chờ phản hồi qua email' :
        'Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn.';
      
      const responseTime = Date.now() - startTime;
      const fallbackSessionId = req.body?.sessionId || this.generateSessionId();
      
      // Try to save error conversation
      try {
        await this.saveConversation({
          sessionId: fallbackSessionId,
          userEmail: req.user?.email || null,
          userRole: req.user?.role || 'anonymous',
          userMessage: req.body?.question || req.body?.message || '',
          botResponse: errorResponse,
          contextDocuments: [],
          responseTime,
          routing: 'error',
          metadata: { error: error.message, ...routingMetadata }
        });
      } catch (saveError) {
        console.error('Error saving error conversation:', saveError);
      }

      // If authenticated, trigger webhook for error
      if (isUserAuthenticated) {
        try {
          await this.sendSupportNotification({
            event_type: 'chatbot_error_support_request',
            question: req.body?.question || req.body?.message || '',
            userId: req.user?.email,
            sessionId: fallbackSessionId,
            timestamp: new Date().toISOString(),
            userRole: req.user?.role,
            error: true,
            errorMessage: error.message
          });
          console.log('📤 Error notification sent to n8n');
        } catch (webhookError) {
          console.error('❌ Error sending error notification:', webhookError.message);
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
  };

  /**
   * Generate new session ID
   */
  generateSessionId = () => {
    return randomUUID();
  }

  /**
   * Save conversation to database
   * @param {Object} conversationData - {sessionId, userEmail, userRole, userMessage, botResponse, contextDocuments, responseTime, routing?, metadata?}
   */
  saveConversation = async (conversationData) => {
    try {
      // Try to insert with routing and metadata (new columns for 2-call architecture)
      const query = `
        INSERT INTO chatbot_conversations (
          session_id, user_email, user_role, user_message, 
          bot_response, context_documents, response_time_ms, 
          routing, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id
      `;

      const values = [
        conversationData.sessionId,
        conversationData.userEmail,
        conversationData.userRole,
        conversationData.userMessage,
        conversationData.botResponse,
        JSON.stringify(conversationData.contextDocuments || []),
        conversationData.responseTime,
        conversationData.routing || 'unknown',
        JSON.stringify(conversationData.metadata || {})
      ];

      try {
        const result = await this.pool.query(query, values);
        return result.rows[0].id;
      } catch (columnsError) {
        // Fallback: columns don't exist yet, use original query
        console.log('⚠️  [SAVE] routing/metadata columns not found, using basic schema');
        
        const basicQuery = `
          INSERT INTO chatbot_conversations (
            session_id, user_email, user_role, user_message, 
            bot_response, context_documents, response_time_ms, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING id
        `;

        const basicValues = [
          conversationData.sessionId,
          conversationData.userEmail,
          conversationData.userRole,
          conversationData.userMessage,
          conversationData.botResponse,
          JSON.stringify(conversationData.contextDocuments || []),
          conversationData.responseTime
        ];

        const result = await this.pool.query(basicQuery, basicValues);
        return result.rows[0].id;
      }
    } catch (error) {
      console.error('❌ Error saving conversation:', error);
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