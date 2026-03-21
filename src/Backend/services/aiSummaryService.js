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
        max_tokens: 500,  // Tăng lên 500 để đủ nội dung (≈ 350 từ tiếng Việt)
        temperature: 0.7,  // Tăng lên 0.7 cho tự nhiên hơn
      });
      
      const summary = response.choices[0].message.content.trim();
      
      // Kiểm tra nếu response bị cắt ngắn
      if (response.choices[0].finish_reason === 'length') {
        console.warn('⚠️ AI summary was truncated due to token limit');
      }
      
      return summary;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw new Error('Không thể tạo tóm tắt AI: ' + error.message);
    }
  }
}

module.exports = new AISummaryService();