const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence, RunnablePassthrough } = require('@langchain/core/runnables');

/**
 * RAG Chain Service using LangChain
 * Creates a complete RAG pipeline with document retrieval and response generation
 */
class RAGChainService {
  constructor(options = {}) {
    // Initialize Gemini model for response generation
    this.model = new ChatGoogleGenerativeAI({
      model: options.modelName || 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY,
      maxOutputTokens: options.maxOutputTokens || 3000,
      temperature: options.temperature || 0.5,
    });

    // Define the RAG prompt template
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

  /**
   * Create a RAG chain with the given vector store
   * @param {Object} vectorStore - Vector store instance with similarity search
   * @returns {Object} Runnable sequence for RAG
   */
  createRAGChain(vectorStore) {
    // Format documents for context
    const formatDocuments = (docs) => {
      if (!docs || docs.length === 0) {
        return 'Hiện chưa có đoạn văn bản nào trùng khớp trong cơ sở dữ liệu.';
      }
      
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
        context: (input) => {
          // Validate vector store again before use
          if (!localVectorStore || typeof localVectorStore.similaritySearch !== 'function') {
            console.error('Vector store validation failed in context function');
            return Promise.resolve('Hiện chưa có đoạn văn bản nào trùng khớp trong cơ sở dữ liệu.');
          }
          
          // Perform similarity search and format documents
          return localVectorStore
            .similaritySearch(input.question, 5) // Retrieve top 5 most similar documents
            .then(formatDocuments)
            .catch(error => {
              console.error('Error in similarity search:', error);
              return 'Hiện chưa có đoạn văn bản nào trùng khớp trong cơ sở dữ liệu.';
            });
        },
        question: (input) => input.question,
      },
      this.ragPrompt,
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
      const chain = this.createRAGChain(vectorStore);
      const result = await chain.invoke({ question });
      return result;
    } catch (error) {
      console.error('❌ Error in RAG execution:', error);
      
      // Return fallback message as per requirements
      if (error.message.includes('quota') || error.message.includes('rate')) {
        return 'Hiện hệ thống đang tạm thời không thể xử lý yêu cầu. Vui lòng thử lại sau.';
      }
      
      return 'Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn.';
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
      // Validate vector store before use
      if (!vectorStore || typeof vectorStore.similaritySearch !== 'function') {
        console.error('Invalid vector store in getRelevantDocuments');
        return [];
      }
      
      const documents = await vectorStore.similaritySearch(question, k);
      return documents;
    } catch (error) {
      console.error('❌ Error retrieving relevant documents:', error);
      return [];
    }
  }
}

module.exports = RAGChainService;