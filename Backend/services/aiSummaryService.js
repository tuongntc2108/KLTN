const { OpenAI } = require('openai');

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class AISummaryService {
  constructor() {
    this.modelName = "gpt-3.5-turbo";
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

      const response = await openai.chat.completions.create({
        model: this.modelName,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.5,
      });
      
      const summary = response.choices[0].message.content.trim();
      
      return summary;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw new Error('Không thể tạo tóm tắt AI: ' + error.message);
    }
  }
}

module.exports = new AISummaryService();