const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');

/**
 * Course Answer Generator Service
 * Specialized LLM chain for generating answers about course content
 * This is Call #2 in the 2-call architecture
 */
class CourseAnswerGenerator {
  constructor(options = {}) {
    this.model = new ChatOpenAI({
      modelName: options.modelName || 'gpt-3.5-turbo',
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: options.maxOutputTokens || 2000,
      temperature: options.temperature || 0.7, // Slightly higher for more natural answers
    });

    this.isAuthenticatedFlow = options.authenticatedFlow === true;
  }

  /**
   * Generate answer for course content query
   * @param {string} question - User question
   * @param {Object|Array} courseContent - Single course or array of courses with training_content
   * @param {string} conversationHistory - Formatted previous turns (from ConversationMemoryService)
   * @param {boolean} multiple - True if multiple course candidates (need disambiguation)
   * @returns {Promise<string>} Generated answer
   */
  async generateCourseContentAnswer(question, courseContent, conversationHistory = '', multiple = false) {
    try {
      console.log(`🤖 [COURSE ANSWER GEN] Generating answer for question: "${question.substring(0, 60)}..."`);
      console.log(`   Multiple courses: ${multiple}, Has history: ${conversationHistory.length > 0}`);

      // Build context from course(s)
      const courseContext = this.formatCourseContext(courseContent, multiple);

      // Choose prompt template based on number of candidates
      const promptTemplate = multiple ?
        this.buildMultiCourseSelectorPrompt() :
        this.buildSingleCoursePrompt();

      // Build input with context
      const input = await promptTemplate.format({
        course_context: courseContext,
        conversation_history: conversationHistory || 'Không có lịch sử trước đó',
        question: question
      });

      console.log(`📝 [COURSE ANSWER GEN] Final prompt built, sending to LLM...`);
      console.log(`   Input length: ${input.length} characters`);

      const answer = await this.model.invoke(input);
      const response = answer.content;

      console.log(`✅ [COURSE ANSWER GEN] Answer generated (${response.length} chars)`);
      console.log(`   Preview: "${response.substring(0, 80)}..."`);

      return response;
    } catch (error) {
      console.error('❌ [COURSE ANSWER GEN] Error:', error.message);
      
      // Return fallback message based on auth status
      if (this.isAuthenticatedFlow) {
        return 'Tôi không rõ thông tin này, câu hỏi đã được gửi đến tư vấn viên. Vui lòng chờ phản hồi qua email';
      } else {
        return 'Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn.';
      }
    }
  }

  /**
   * Build prompt for single course content answer
   * @returns {PromptTemplate}
   */
  buildSingleCoursePrompt() {
    const template = `Bạn là trợ lý AI chuyên bật về các khóa học trong hệ thống quản lý chứng chỉ blockchain.

LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
{conversation_history}

THÔNG TIN KHÓA HỌC LIÊN QUAN:
{course_context}

CÂU HỎI CỦA NGƯỜI DÙNG: {question}

QUY TẮC TUÂN THỦ:
- Trả lời CHỈ dựa trên nội dung khóa học được cung cấp ở trên
- Không bịa thông tin hoặc đoán mò
- Giữ giọng điệu thân thiện, hữu ích, chuyên nghiệp
- Trả lời bằng tiếng Việt
- Nếu câu hỏi ngoài phạm vi nội dung khóa học, hãy thông báo "Thông tin này nằm ngoài nội dung của khóa học. Bạn có thể liên hệ với đơn vị đào tạo để tìm hiểu thêm."
- Có thể tham khảo lịch sử hội thoại để hiểu context nếu cần

Hãy trả lời câu hỏi một cách chi tiết, rõ ràng, có cấu trúc (nếu là danh sách).`;

    return PromptTemplate.fromTemplate(template);
  }

  /**
   * Build prompt for multi-course disambiguation
   * @returns {PromptTemplate}
   */
  buildMultiCourseSelectorPrompt() {
    const template = `Bạn là trợ lý AI chuyên bật về các khóa học trong hệ thống quản lý chứng chỉ blockchain.

LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
{conversation_history}

THÔNG TIN NHIỀU KHÓA HỌC KHỚP:
{course_context}

CÂU HỎI CỦA NGƯỜI DÙNG: {question}

QUY TẮC TUÂN THỦ:
- Có NHIỀU khóa học khớp với câu hỏi
- Trước hết, xin xác nhận: người dùng đang hỏi về khóa học nào? (liệt kê 2-3 khóa học gợi ý)
- Sau khi xác nhận, mới trả lời chi tiết về nội dung khóa học đó
- Giữ câu hỏi xác nhận ngắn gọn, rõ ràng
- Trả lời bằng tiếng Việt

Ví dụ xác nhận: "Mình thấy có 2 khóa học liên quan. Bạn muốn biết về:
1. Blockchain cơ bản
2. Smart Contract nâng cao
Bạn chọn khóa học nào?"`;

    return PromptTemplate.fromTemplate(template);
  }

  /**
   * Format course(s) for context injection
   * @param {Object|Array} courseContent - Course or array of courses
   * @param {boolean} multiple - Whether to format for multiple selection
   * @returns {string} Formatted course context
   */
  formatCourseContext(courseContent, multiple = false) {
    if (!courseContent) {
      return 'Không có dữ liệu khóa học.';
    }

    const courses = Array.isArray(courseContent) ? courseContent : [courseContent];

    if (courses.length === 0) {
      return 'Không tìm thấy khóa học phù hợp.';
    }

    return courses.map((course, idx) => {
      const trainingContent = course.training_content || 'Chưa có nội dung';
      const truncated = trainingContent.length > 2500 ?
        trainingContent.substring(0, 2500) + '\n[... Nội dung tiếp tục ...]' :
        trainingContent;

      return `${idx + 1}. **${course.course_name}**
   Mô tả: ${course.course_description || 'N/A'}
   Thời lượng: ${course.duration || 'N/A'}
   
   Nội dung chương trình:
   ${truncated}`;
    }).join('\n\n---\n\n');
  }

  /**
   * Handle disambiguation when multiple courses match with similar scores
   * Returns a question asking user to clarify which course
   * @param {Array} courses - Array of matching courses
   * @returns {string} Disambiguation question
   */
  buildDisambiguationQuestion(courses) {
    if (courses.length === 0) return 'Xin lỗi, không tìm thấy khóa học.';

    const topCourses = courses.slice(0, 3); // Top 3 candidates
    const options = topCourses.map((course, idx) => 
      `${idx + 1}. ${course.course_name}${course.similarity_score ? ` (${(course.similarity_score * 100).toFixed(0)}%)` : ''}`
    ).join('\n');

    return `Mình tìm thấy nhiều khóa học liên quan. Bạn muốn biết về khóa học nào?
${options}

Vui lòng nêu rõ tên khóa học hoặc chọn từ danh sách trên.`;
  }
}

module.exports = CourseAnswerGenerator;
