const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class AISummaryService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async generateCertificateSummary(courseData) {
    try {
      const { course_name, duration, course_description, training_content } = courseData;
      
      const prompt = `Bạn là trợ lý AI chuyên tóm tắt chứng chỉ học tập.
Hãy tóm tắt ngắn gọn và chuyên nghiệp chứng chỉ sau, phù hợp để hiển thị trên hệ thống đào tạo.

Tên khóa học: ${course_name || 'Không có thông tin'}
Thời lượng: ${duration || 'Không có thông tin'}
Mô tả khóa học: ${course_description || 'Không có thông tin'}
Chương trình đào tạo: ${training_content || 'Không có thông tin'}

Yêu cầu: Trả về nội dung tóm tắt 2–3 câu, không cần JSON, chỉ văn bản thuần.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text().trim();
      
      return summary;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw new Error('Không thể tạo tóm tắt AI: ' + error.message);
    }
  }
}

module.exports = new AISummaryService();