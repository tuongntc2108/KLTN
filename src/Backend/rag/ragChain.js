const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence, RunnablePassthrough } = require('@langchain/core/runnables');
const { classifyQueryMetadata } = require('./metadataClassification');

/**
 * RAG Chain Service using LangChain
 * Creates a complete RAG pipeline with document retrieval and response generation
 */
class RAGChainService {
  constructor(options = {}) {
    // Store options for later use
    this.options = options;
    
    // Initialize OpenAI model for response generation
    this.model = new ChatOpenAI({
      modelName: options.modelName || 'gpt-3.5-turbo',
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: options.maxOutputTokens || 3000,
      temperature: options.temperature || 0.5,
    });

    // Determine if this is for authenticated users
    const isAuthenticatedFlow = options.authenticatedFlow === true;
    
    // Define the RAG prompt template based on authentication status
    if (isAuthenticatedFlow) {
      // Prompt template for authenticated users - with different fallback message
      this.ragPrompt = PromptTemplate.fromTemplate(`
Bạn là trợ lý AI nội bộ của hệ thống quản lý chứng chỉ blockchain.

Hệ thống này có các chức năng chính:
- Đăng nhập/đăng ký tài khoản
- Kết nối ví MetaMask 
- Xem và tham gia khóa học
- Nhận chứng chỉ blockchain (SBT - Soulbound Token)
- Xác minh chứng chỉ
- Quản lý profile và thông tin cá nhân

QUY TẮC TUÂN THỦ:
- Trả lời câu hỏi dựa TRÊN THÔNG TIN ĐƯỢC CUNG CẤP DƯỚI ĐÂY, không được bịa thông tin
- Nếu thông tin chưa đủ để trả lời, bắt buộc phải trả lời như sau: "Tôi không rõ thông tin này, câu hỏi đã được gửi đến tư vấn viên. Vui lòng chờ phản hồi qua email". Không đưa ra câu trả lời khác.
- Không từ chối vì khác biệt nhỏ về từ khóa; hãy suy luận các cụm tương đương như "chứng chỉ" và "chứng chỉ NFT"
- Giữ giọng điệu tích cực và thực tế
- Trả lời bằng tiếng Việt một cách thân thiện và hữu ích

THÔNG TIN LIÊN QUAN TỪ TÀI LIỆU:
{context}

CÂU HỎI CỦA NGƯỜI DÙNG: {question}

Hãy trả lời dựa trên thông tin được cung cấp ở trên. Nếu thông tin chưa đủ, hãy trả về: "Tôi không rõ thông tin này, câu hỏi đã được gửi đến tư vấn viên. Vui lòng chờ phản hồi qua email"
`);
    } else {
      // Original prompt template for non-authenticated users
      this.ragPrompt = PromptTemplate.fromTemplate(`
Bạn là trợ lý AI nội bộ của hệ thống quản lý chứng chỉ blockchain. 

Hệ thống này có các chức năng chính:
- Đăng nhập/đăng ký tài khoản
- Kết nối ví MetaMask 
- Xem và tham gia khóa học
- Nhận chứng chỉ blockchain (SBT - Soulbound Token)
- Xác minh chứng chỉ
- Quản lý profile và thông tin cá nhân

QUY TẮC TUÂN THỦ:
- Trả lời câu hỏi dựa TRÊN THÔNG TIN ĐƯỢC CUNG CẤP DƯỚI ĐÂY, không được bịa thông tin
- Nếu thông tin chưa đủ để trả lời, hãy trả về: "Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn."
- Không từ chối vì khác biệt nhỏ về từ khóa; hãy suy luận các cụm tương đương như "chứng chỉ" và "chứng chỉ NFT"
- Giữ giọng điệu tích cực và thực tế
- Trả lời bằng tiếng Việt một cách thân thiện và hữu ích

THÔNG TIN LIÊN QUAN TỪ TÀI LIỆU:
{context}

CÂU HỎI CỦA NGƯỜI DÙNG: {question}

Hãy trả lời dựa trên thông tin được cung cấp ở trên. Nếu thông tin chưa đủ, hãy trả về: "Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn."
`);
    }
  }

  /**
   * Create a RAG chain with the given vector store
   * @param {Object} vectorStore - Vector store instance with similarity search
   * @returns {Object} Runnable sequence for RAG
   */
  createRAGChain(vectorStore) {
    // Log the prompt template being used
    console.log('📝 [PROMPT] Using prompt template for', this.options.authenticatedFlow ? 'AUTHENTICATED' : 'NON-AUTHENTICATED', 'users');
    console.log('📝 [PROMPT] Fallback message:', this.options.authenticatedFlow ? 
      '"Tôi không rõ thông tin này, câu hỏi đã được gửi đến tư vấn viên. Vui lòng chờ phản hồi qua email"' : 
      '"Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn."');
    // Format documents for context
    const formatDocuments = (docs) => {
      if (!docs || docs.length === 0) {
        console.log('📄 [RAG] No relevant documents found in vector store');
        return 'Hiện chưa có đoạn văn bản nào trùng khớp trong cơ sở dữ liệu.';
      }
      
      console.log(`📄 [RAG] Retrieved ${docs.length} relevant documents:`);
      docs.forEach((doc, index) => {
        console.log(`  ${index + 1}. [${doc.metadata.title || 'Unknown'}] Similarity: ${((doc.metadata.similarityScore || 0) * 100).toFixed(1)}%`);
        console.log(`     Content preview: ${doc.pageContent.substring(0, 100)}...`);
      });
      
      return docs.map((doc, index) => 
        `${index + 1}. Từ "${doc.metadata.title || 'Unknown'}" (độ liên quan: ${((doc.metadata.similarityScore || 0) * 100).toFixed(1)}%):\n${doc.pageContent}`
      ).join('\n\n');
    };

    // Store vector store in closure to ensure it's available and validate it
    const localVectorStore = vectorStore;
    
    // Validate that vector store has required methods
    if (!localVectorStore || typeof localVectorStore.similaritySearch !== 'function') {
      throw new Error('Invalid vector store: missing similaritySearch method');
    }

    // Create the RAG chain
    const chain = RunnableSequence.from([
      {
        context: async (input) => {
          // Log the incoming question
          console.log('❓ [INPUT] User question received:', input.question);
          
          // Validate vector store again before use
          if (!localVectorStore || typeof localVectorStore.similaritySearchVectorWithScore !== 'function') {
            console.error('Vector store validation failed in context function');
            return 'Hiện chưa có đoạn văn bản nào trùng khớp trong cơ sở dữ liệu.';
          }
          
          try {
            // Classify query metadata to filter relevant documents
            const queryMetadata = await classifyQueryMetadata(input.question);
            
            console.log(`🎯 [METADATA FILTER] Inferred metadata from question:`, queryMetadata);
            
            // Perform similarity search with metadata filters
            const docs = await localVectorStore.similaritySearchVectorWithScore(
              input.question, 
              5, // Retrieve top 5 most similar documents
              queryMetadata // Apply metadata filters
            );
            
            // Extract documents from results (each result is [document, similarity_score])
            const documents = docs.map(([doc, score]) => ({
              ...doc,
              metadata: {
                ...doc.metadata,
                similarityScore: score
              }
            }));
            
            // Check if documents were found and have adequate similarity scores
            if (documents.length === 0) {
              console.log('📄 [RAG] No relevant documents found with metadata filters');
              
              // Fallback: try without filters
              const fallbackDocs = await localVectorStore.similaritySearch(input.question, 5);
              if (fallbackDocs.length === 0) {
                console.log('📄 [CONTEXT] Returning: No documents found');
                return 'Hiện chưa có đoạn văn bản nào trùng khớp trong cơ sở dữ liệu.';
              }
              
              console.log(`📄 [RAG] Fallback search returned ${fallbackDocs.length} documents`);
              const formattedContext = formatDocuments(fallbackDocs);
              console.log('📄 [CONTEXT] Formatted context length:', formattedContext.length, 'characters');
              return formattedContext;
            }
            
            // Check if similarity scores are adequate
            const adequateScoreThreshold = 0.3; // Lower threshold for filtered results
            const adequateDocs = documents.filter(doc => 
              (doc.metadata.similarityScore || 0) >= adequateScoreThreshold
            );
            
            if (adequateDocs.length === 0) {
              console.log(`📄 [RAG] No documents found with similarity score >= ${adequateScoreThreshold}`);
              
              // Low confidence fallback: try unfiltered search
              const fallbackDocs = await localVectorStore.similaritySearch(input.question, 5);
              if (fallbackDocs.length === 0) {
                console.log('📄 [CONTEXT] Returning: No documents found');
                return 'Hiện chưa có đoạn văn bản nào trùng khớp trong cơ sở dữ liệu.';
              }
              
              console.log(`📄 [RAG] Fallback search returned ${fallbackDocs.length} documents`);
              const formattedContext = formatDocuments(fallbackDocs);
              console.log('📄 [CONTEXT] Formatted context length:', formattedContext.length, 'characters');
              return formattedContext;
            }
            
            const formattedContext = formatDocuments(adequateDocs);
            console.log('📄 [CONTEXT] Formatted context length:', formattedContext.length, 'characters');
            console.log('📄 [CONTEXT] Number of documents used:', adequateDocs.length);
            return formattedContext;
          } catch (error) {
            console.error('Error in similarity search with metadata filters:', error);
            // Fallback to unfiltered search
            try {
              const fallbackDocs = await localVectorStore.similaritySearch(input.question, 5);
              return formatDocuments(fallbackDocs);
            } catch (fallbackError) {
              console.error('Error in fallback similarity search:', fallbackError);
              return 'Hiện chưa có đoạn văn bản nào trùng khớp trong cơ sở dữ liệu.';
            }
          }
        },
        question: (input) => input.question,
      },
      this.ragPrompt,
      (prompt) => {
        // Log the final prompt being sent to LLM
        console.log('🤖 [LLM PROMPT] Final prompt sent to LLM:');
        console.log(prompt);
        console.log('--- End of prompt ---');
        return prompt;
      },
      this.model,
      new StringOutputParser(),
    ]);

    return chain;
  }

  /**
   * Execute the RAG chain with a question
   * @param {Object} vectorStore - Vector store instance
   * @param {string} question - User question
   * @returns {Promise<string>} Generated response
   */
  async executeRAG(vectorStore, question) {
    try {
      console.log('\n🚀 [RAG] Starting RAG execution...');
      console.log(`❓ [RAG] User Question: "${question}"`);
      
      const chain = this.createRAGChain(vectorStore);
      console.log('⚙️  [RAG] Chain created, executing...');
      
      const result = await chain.invoke({ question });
      
      console.log('✅ [RAG] LLM Response received:');
      console.log(`📝 Response (${result.length} characters)`);
      console.log('📝 Response content:', result);
      console.log('---');
      
      // Log if fallback response was triggered
      if (this.options.authenticatedFlow && result.includes('tư vấn viên')) {
        console.log('⚠️  [RAG] Fallback response triggered for authenticated user - webhook will be sent');
      } else if (!this.options.authenticatedFlow && result.includes('22021207@vnu.edu.vn')) {
        console.log('⚠️  [RAG] Fallback response triggered for non-authenticated user');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error in RAG execution:', error);
      
      // Return fallback message as per requirements
      if (error.message.includes('quota') || error.message.includes('rate')) {
        return 'Hiện hệ thống đang tạm thời không thể xử lý yêu cầu. Vui lòng thử lại sau.';
      }
      
      // Return appropriate fallback message based on authentication status
      if (this.options && this.options.authenticatedFlow) {
        return 'Tôi không rõ thông tin này, câu hỏi đã được gửi đến tư vấn viên. Vui lòng chờ phản hồi qua email';
      } else {
        return 'Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn.';
      }
    }
  }

  /**
   * Get relevant documents for a question
   * @param {Object} vectorStore - Vector store instance
   * @param {string} question - User question
   * @param {number} k - Number of documents to retrieve
   * @returns {Promise<Array>} Array of relevant documents
   */
  async getRelevantDocuments(vectorStore, question, k = 5) {
    try {
      // Classify query metadata to filter relevant documents
      const queryMetadata = await classifyQueryMetadata(question);
      
      console.log(`🎯 [METADATA FILTER] Inferred metadata from question:`, queryMetadata);
      
      // Perform similarity search with metadata filters
      const docs = await vectorStore.similaritySearchVectorWithScore(
        question, 
        k,
        queryMetadata // Apply metadata filters
      );
      
      // Extract documents from results (each result is [document, similarity_score])
      const documents = docs.map(([doc, score]) => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          similarityScore: score
        }
      }));
      
      // Check if documents were found and have adequate similarity scores
      if (documents.length === 0) {
        console.log('📄 [RAG] No relevant documents found with metadata filters');
        
        // Fallback: try without filters
        const fallbackDocs = await vectorStore.similaritySearch(question, k);
        return fallbackDocs;
      }
      
      // Check if similarity scores are adequate
      const adequateScoreThreshold = 0.3; // Lower threshold for filtered results
      const adequateDocs = documents.filter(doc => 
        (doc.metadata.similarityScore || 0) >= adequateScoreThreshold
      );
      
      if (adequateDocs.length === 0) {
        console.log(`📄 [RAG] No documents found with similarity score >= ${adequateScoreThreshold}`);
        // Fallback to unfiltered search
        const fallbackDocs = await vectorStore.similaritySearch(question, k);
        return fallbackDocs;
      }
      
      return adequateDocs;
    } catch (error) {
      console.error('❌ Error retrieving relevant documents:', error);
      
      // Fallback to unfiltered search
      try {
        const fallbackDocs = await vectorStore.similaritySearch(question, k);
        return fallbackDocs;
      } catch (fallbackError) {
        console.error('❌ Error in fallback retrieval:', fallbackError);
        return [];
      }
    }
  }
}

module.exports = RAGChainService;