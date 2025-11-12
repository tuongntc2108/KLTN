const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Pool } = require('pg');
const documentIngestionService = require('./documentIngestionService');
const { randomUUID } = require('crypto');

class ChatbotService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Database connection
        this.pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'course_management',
            password: process.env.DB_PASSWORD || 'postgres',
            port: process.env.DB_PORT || 5432,
        });
    }

    /**
     * Generate response using RAG pipeline
     */
    async generateResponse(userMessage, sessionId, userEmail = null, userRole = 'anonymous') {
        const startTime = Date.now();
        
        try {
            console.log('Generating response for:', { userMessage, sessionId, userEmail });

            // 1. Get relevant documents using vector similarity search
            const relevantDocs = await documentIngestionService.searchSimilarDocuments(
                userMessage,
                5, // limit
                0.6 // similarity threshold
            );

            console.log('Found relevant documents:', relevantDocs.length);

            // 2. Build context from relevant documents
            const context = this.buildContextFromDocuments(relevantDocs);

            // 3. Get system prompt and configuration
            const systemPrompt = this.getDefaultSystemPrompt();
            const maxTokens = 1000;

            // 4. Generate response using Gemini
            const prompt = this.buildPrompt(systemPrompt, context, userMessage, userRole);
            
            const result = await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: maxTokens,
                    temperature: 0.7,
                },
            });

            const response = result.response.text();
            const responseTime = Date.now() - startTime;

            // 5. Store conversation in database
            await this.saveConversation({
                sessionId,
                userEmail,
                userRole,
                userMessage,
                botResponse: response,
                contextDocuments: relevantDocs.map(doc => ({ id: doc.id, similarity: doc.similarity })),
                responseTime
            });

            // 6. Update analytics
            await this.updateAnalytics(userEmail, responseTime);

            return {
                response,
                responseTime,
                contextUsed: relevantDocs.length > 0,
                documentCount: relevantDocs.length,
                sessionId
            };

        } catch (error) {
            console.error('Error generating response:', error);
            const errorResponse = 'Xin lỗi, tôi gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.';
            
            // Still save the conversation with error
            try {
                await this.saveConversation({
                    sessionId,
                    userEmail,
                    userRole,
                    userMessage,
                    botResponse: errorResponse,
                    contextDocuments: [],
                    responseTime: Date.now() - startTime
                });
            } catch (saveError) {
                console.error('Error saving error conversation:', saveError);
            }

            return {
                response: errorResponse,
                error: true,
                responseTime: Date.now() - startTime,
                sessionId
            };
        }
    }

    /**
     * Build context string from relevant documents
     */
    buildContextFromDocuments(documents) {
        if (documents.length === 0) {
            return 'Không có tài liệu liên quan được tìm thấy trong cơ sở dữ liệu.';
        }

        let context = 'Thông tin liên quan từ tài liệu hướng dẫn:\n\n';
        
        documents.forEach((doc, index) => {
            context += `${index + 1}. Từ "${doc.title}" (độ liên quan: ${(doc.similarity * 100).toFixed(1)}%):\n`;
            context += `${doc.content_chunk}\n\n`;
        });

        return context;
    }

    /**
     * Build complete prompt for Gemini
     */
    buildPrompt(systemPrompt, context, userMessage, userRole) {
        const roleContext = this.getRoleContext(userRole);
        
        return `${systemPrompt}

${roleContext}

THÔNG TIN LIÊN QUAN:
${context}

CÂUHỎI CỦA NGƯỜI DÙNG: ${userMessage}

Hãy trả lời dựa trên thông tin được cung cấp ở trên. Nếu thông tin không đủ để trả lời, hãy thông báo rằng bạn cần thêm thông tin hoặc gợi ý người dùng liên hệ bộ phận hỗ trợ. Trả lời bằng tiếng Việt một cách thân thiện và hữu ích.`;
    }

    /**
     * Get role-specific context
     */
    getRoleContext(userRole) {
        const contexts = {
            'student': 'Bạn đang hỗ trợ một học viên. Tập trung vào việc hướng dẫn sử dụng tính năng xem khóa học, nhận chứng chỉ, và quản lý ví điện tử.',
            'issuer': 'Bạn đang hỗ trợ một tổ chức cấp chứng chỉ. Tập trung vào việc hướng dẫn tạo khóa học, quản lý học viên, và cấp phát chứng chỉ.',
            'admin': 'Bạn đang hỗ trợ quản trị viên hệ thống. Có thể cung cấp thông tin chi tiết về tất cả chức năng và cấu hình hệ thống.',
            'anonymous': 'Bạn đang hỗ trợ người dùng chưa đăng nhập. Tập trung vào thông tin chung và hướng dẫn đăng nhập/đăng ký.'
        };
        
        return contexts[userRole] || contexts['anonymous'];
    }

    /**
     * Get default system prompt
     */
    getDefaultSystemPrompt() {
        return `Bạn là trợ lý AI hỗ trợ người dùng sử dụng hệ thống quản lý chứng chỉ blockchain. 

Hệ thống này có các chức năng chính:
- Đăng nhập/đăng ký tài khoản
- Kết nối ví MetaMask 
- Xem và tham gia khóa học
- Nhận chứng chỉ blockchain (SBT - Soulbound Token)
- Xác minh chứng chỉ
- Quản lý profile và thông tin cá nhân

Hãy trả lời câu hỏi một cách hữu ích, chính xác và thân thiện. Sử dụng thông tin từ tài liệu hướng dẫn được cung cấp để đưa ra câu trả lời phù hợp.`;
    }

    /**
     * Save conversation to database
     */
    async saveConversation(conversationData) {
        try {
            const query = `
                INSERT INTO chatbot_conversations (
                    session_id, user_email, user_role, user_message, 
                    bot_response, context_documents, response_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
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
            throw error;
        }
    }

    /**
     * Get conversation history for a session
     */
    async getConversationHistory(sessionId, limit = 10) {
        try {
            const query = `
                SELECT user_message, bot_response, created_at, feedback_rating
                FROM chatbot_conversations 
                WHERE session_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2
            `;

            const result = await this.pool.query(query, [sessionId, limit]);
            return result.rows.reverse(); // Return in chronological order
        } catch (error) {
            console.error('Error getting conversation history:', error);
            throw error;
        }
    }

    /**
     * Save user feedback
     */
    async saveFeedback(conversationId, rating, comment = null) {
        try {
            const query = `
                UPDATE chatbot_conversations 
                SET feedback_rating = $2, feedback_comment = $3
                WHERE id = $1
            `;

            await this.pool.query(query, [conversationId, rating, comment]);
            return true;
        } catch (error) {
            console.error('Error saving feedback:', error);
            throw error;
        }
    }

    /**
     * Generate new session ID
     */
    generateSessionId() {
        return randomUUID();
    }

    /**
     * Update analytics data
     */
    async updateAnalytics(userEmail, responseTime) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const query = `
                INSERT INTO chatbot_analytics (date, total_conversations, unique_users, avg_response_time_ms)
                VALUES ($1, 1, 1, $2)
                ON CONFLICT (date)
                DO UPDATE SET 
                    total_conversations = chatbot_analytics.total_conversations + 1,
                    unique_users = CASE 
                        WHEN $3 IS NOT NULL THEN chatbot_analytics.unique_users + 1 
                        ELSE chatbot_analytics.unique_users 
                    END,
                    avg_response_time_ms = (
                        (chatbot_analytics.avg_response_time_ms * chatbot_analytics.total_conversations + $2) / 
                        (chatbot_analytics.total_conversations + 1)
                    )
            `;

            await this.pool.query(query, [today, responseTime, userEmail]);
        } catch (error) {
            console.error('Error updating analytics:', error);
            // Don't throw error for analytics failure
        }
    }

    /**
     * Get chatbot statistics
     */
    async getChatbotStats() {
        try {
            const query = `
                SELECT 
                    SUM(total_conversations) as total_conversations,
                    AVG(avg_response_time_ms) as avg_response_time,
                    COUNT(DISTINCT date) as active_days,
                    MAX(date) as last_active_date
                FROM chatbot_analytics
                WHERE date >= CURRENT_DATE - INTERVAL '30 days'
            `;

            const result = await this.pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Error getting chatbot stats:', error);
            throw error;
        }
    }

    /**
     * Search conversation history
     */
    async searchConversations(searchQuery, userEmail = null, limit = 50) {
        try {
            let query = `
                SELECT session_id, user_message, bot_response, created_at, user_role
                FROM chatbot_conversations 
                WHERE (user_message ILIKE $1 OR bot_response ILIKE $1)
            `;
            const params = [`%${searchQuery}%`];

            if (userEmail) {
                query += ` AND user_email = $2`;
                params.push(userEmail);
            }

            query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
            params.push(limit);

            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Error searching conversations:', error);
            throw error;
        }
    }
}

module.exports = ChatbotService;

