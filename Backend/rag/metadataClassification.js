const { ChatOpenAI } = require('@langchain/openai');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');

/**
 * LLM-based Metadata Classification Service for RAG System
 * Uses LLM to classify metadata for better accuracy
 */

// Initialize LLM for classification
let llm;

function getLLM() {
  if (!llm) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    llm = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      apiKey: process.env.OPENAI_API_KEY,
      maxTokens: 200,
      temperature: 0.1, // Low temperature for consistent classification
    });
  }
  return llm;
}

/**
 * Define metadata schema for document chunks
 */
const METADATA_SCHEMA = {
  user_role: {
    values: ["training_org", "student", "verifier", "all"],
    description: "Target user role for this content"
  },
  section: {
    values: [
      "introduction",
      "training_org_guide", 
      "student_guide", 
      "verifier_guide", 
      "faq", 
      "support"
    ],
    description: "Document section type"
  },
  topic: {
    values: [
      "overview",
      "login", 
      "course_management", 
      "student_management", 
      "certificate_issue", 
      "certificate_receive", 
      "certificate_verify", 
      "wallet", 
      "faq", 
      "support"
    ],
    description: "Main topic covered in this content"
  },
  action: {
    values: [
      "create", 
      "update", 
      "delete", 
      "receive", 
      "verify", 
      "connect", 
      "revoke", 
      "general"
    ],
    description: "Primary action described in this content"
  },
  title: {
    type: "string",
    description: "Short description of the chunk content"
  }
};

/**
 * Classify metadata for a single document chunk using LLM
 * @param {string} content - Document chunk content
 * @param {string} title - Document title
 * @returns {Promise<Object>} Classified metadata object
 */
async function classifySingleChunkMetadata(content, title = '') {
  try {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('No OPENAI_API_KEY found, using rule-based classification');
      return ruleBasedClassifyChunkMetadata(content, title);
    }
    
    console.log(`LLM classification requested for content length: ${content.length}, title: ${title}`);
    
    const systemPrompt = `Bạn là chuyên gia phân loại tài liệu. Hãy phân tích nội dung văn bản sau và gán các nhãn siêu dữ liệu phù hợp theo schema sau:

Schema siêu dữ liệu:
- user_role: "training_org" | "student" | "verifier" | "all"
- section: "introduction" | "training_org_guide" | "student_guide" | "verifier_guide" | "faq" | "support" 
- topic: "overview" | "login" | "course_management" | "student_management" | "certificate_issue" | "certificate_receive" | "certificate_verify" | "wallet" | "faq" | "support"
- action: "create" | "update" | "delete" | "receive" | "verify" | "connect" | "revoke" | "general"
- title: string mô tả ngắn nội dung chunk

Chỉ trả về JSON với các trường siêu dữ liệu, không thêm lời văn khác.`;

    const humanPrompt = `Tiêu đề: ${title || 'Không có tiêu đề'}
Nội dung: ${content.substring(0, 2000)}  // Giới hạn độ dài để tránh vượt quá giới hạn token

Hãy phân loại nội dung này theo schema siêu dữ liệu.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(humanPrompt)
    ];

    console.log('Sending classification request to LLM...');
    const response = await getLLM().invoke(messages);
    console.log('LLM response received:', response.content.substring(0, 200) + '...');
    
    // Parse the response
    let metadata;
    try {
      // Try to extract JSON from response
      const jsonString = response.content.match(/\{[\s\S]*\}/)?.[0];
      console.log('JSON string extracted:', jsonString);
      if (jsonString) {
        metadata = JSON.parse(jsonString);
        console.log('Parsed metadata:', metadata);
      } else {
        console.log('No JSON found in response, using rule-based classification');
        return ruleBasedClassifyChunkMetadata(content, title);
      }
    } catch (parseError) {
      console.log('JSON parsing failed:', parseError.message);
      // Fallback to rule-based classification if JSON parsing fails
      return ruleBasedClassifyChunkMetadata(content, title);
    }

    // Ensure all required fields are present
    const validatedMetadata = {
      user_role: metadata.user_role || 'all',
      section: metadata.section || 'support',
      topic: metadata.topic || 'support',
      action: metadata.action || 'general',
      title: metadata.title || title || content.substring(0, 100) + (content.length > 100 ? '...' : '')
    };

    console.log('Final validated metadata:', validatedMetadata);
    return validatedMetadata;
  } catch (error) {
    console.error('LLM classification failed, falling back to rule-based:', error.message);
    console.error('Error details:', error);
    // Fallback to rule-based classification
    return ruleBasedClassifyChunkMetadata(content, title);
  }
}

/**
 * Classify metadata for multiple document chunks efficiently
 * @param {Array} chunks - Array of document chunks [{content, title}, ...]
 * @returns {Promise<Array>} Array of classified metadata objects
 */
async function classifyMultipleChunkMetadata(chunks) {
  if (chunks.length === 0) return [];
  
  console.log(`Starting batch classification for ${chunks.length} chunks`);
  
  // Classify each chunk individually (removed threshold for efficiency consideration)
  const results = [];
  for (const [index, chunk] of chunks.entries()) {
    console.log(`Classifying chunk ${index + 1}/${chunks.length}: ${chunk.title || 'untitled'}`);
    const metadata = await classifySingleChunkMetadata(chunk.content, chunk.title);
    results.push(metadata);
  }
  
  console.log(`Completed batch classification, got ${results.length} results`);
  return results;
}

// Main export function kept for backward compatibility
// But we recommend using the batch approach for efficiency
async function classifyChunkMetadata(content, title = '') {
  // Single chunk classification (maintain backward compatibility)
  return await classifySingleChunkMetadata(content, title);
}

/**
 * Rule-based classification as fallback
 */
function ruleBasedClassifyChunkMetadata(content, title = '') {
  const contentLower = content.toLowerCase();
  const titleLower = title.toLowerCase();
  const fullText = `${titleLower}\n${contentLower}`;
  
  // Initialize metadata object
  const metadata = {
    user_role: null,
    section: null,
    topic: null,
    action: null,
    title: title || content.substring(0, 100) + (content.length > 100 ? '...' : '')
  };

  // Classify user_role
  if (fullText.includes('sinh viên') || fullText.includes('người học') || fullText.includes('học viên')) {
    metadata.user_role = 'student';
  } else if (fullText.includes('đơn vị đào tạo') || fullText.includes('đào tạo') || fullText.includes('issuer')) {
    metadata.user_role = 'training_org';
  } else if (fullText.includes('nhà tuyển dụng') || fullText.includes('bên xác minh') || fullText.includes('xác minh')) {
    metadata.user_role = 'verifier';
  } else {
    metadata.user_role = 'all';
  }

  // Classify section
  if (fullText.includes('giới thiệu') || fullText.includes('tổng quan')) {
    metadata.section = 'introduction';
  } else if (fullText.includes('đơn vị đào tạo') || fullText.includes('hướng dẫn cho đơn vị')) {
    metadata.section = 'training_org_guide';
  } else if (fullText.includes('sinh viên') || fullText.includes('người học') || fullText.includes('hướng dẫn cho sinh viên')) {
    metadata.section = 'student_guide';
  } else if (fullText.includes('nhà tuyển dụng') || fullText.includes('bên xác minh') || fullText.includes('xác minh')) {
    metadata.section = 'verifier_guide';
  } else if (fullText.includes('faq') || fullText.includes('câu hỏi thường gặp')) {
    metadata.section = 'faq';
  } else {
    metadata.section = 'support';
  }

  // Classify topic
  if (fullText.includes('đăng nhập')) {
    metadata.topic = 'login';
  } else if (fullText.includes('khóa học') || fullText.includes('quản lý khóa học')) {
    metadata.topic = 'course_management';
  } else if (fullText.includes('học viên') || fullText.includes('sinh viên') || fullText.includes('quản lý học viên')) {
    metadata.topic = 'student_management';
  } else if (fullText.includes('cấp chứng chỉ') || fullText.includes('tạo chứng chỉ')) {
    metadata.topic = 'certificate_issue';
  } else if (fullText.includes('nhận chứng chỉ') || fullText.includes('lưu trữ chứng chỉ')) {
    metadata.topic = 'certificate_receive';
  } else if (fullText.includes('xác minh chứng chỉ') || fullText.includes('kiểm tra chứng chỉ')) {
    metadata.topic = 'certificate_verify';
  } else if (fullText.includes('ví') || fullText.includes('metamask') || fullText.includes('kết nối ví')) {
    metadata.topic = 'wallet';
  } else if (fullText.includes('faq') || fullText.includes('câu hỏi thường gặp')) {
    metadata.topic = 'faq';
  } else if (fullText.includes('liên hệ') || fullText.includes('hỗ trợ')) {
    metadata.topic = 'support';
  } else if (fullText.includes('tổng quan') || fullText.includes('giới thiệu')) {
    metadata.topic = 'overview';
  }

  // Classify action
  if (fullText.includes('tạo') || fullText.includes('thêm mới')) {
    metadata.action = 'create';
  } else if (fullText.includes('sửa') || fullText.includes('cập nhật')) {
    metadata.action = 'update';
  } else if (fullText.includes('xóa') || fullText.includes('gỡ bỏ')) {
    metadata.action = 'delete';
  } else if (fullText.includes('nhận') || fullText.includes('lưu trữ')) {
    metadata.action = 'receive';
  } else if (fullText.includes('xác minh') || fullText.includes('kiểm tra')) {
    metadata.action = 'verify';
  } else if (fullText.includes('kết nối') || fullText.includes('liên kết')) {
    metadata.action = 'connect';
  } else if (fullText.includes('thu hồi') || fullText.includes('hủy bỏ')) {
    metadata.action = 'revoke';
  } else {
    metadata.action = 'general';
  }

  // Set defaults if not classified
  if (!metadata.topic) {
    metadata.topic = 'support';
  }
  if (!metadata.user_role) {
    metadata.user_role = 'all';
  }

  return metadata;
}

/**
 * Classify metadata from a user question using LLM to guide retrieval
 * @param {string} question - User question
 * @returns {Promise<Object>} Inferred metadata to filter documents
 */
async function classifyQueryMetadata(question) {
  try {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('No OPENAI_API_KEY found for query classification, using rule-based');
      return ruleBasedClassifyQueryMetadata(question);
    }
    
    console.log(`LLM query classification requested for: ${question.substring(0, 100)}...`);
    
    const systemPrompt = `Bạn là chuyên gia phân loại câu hỏi người dùng. Hãy phân tích câu hỏi sau và xác định các siêu dữ liệu liên quan để tìm tài liệu phù hợp.

Schema siêu dữ liệu:
- user_role: "training_org" | "student" | "verifier" | "all"
- topic: "overview" | "login" | "course_management" | "student_management" | "certificate_issue" | "certificate_receive" | "certificate_verify" | "wallet" | "faq" | "support"

Chỉ trả về JSON với các trường siêu dữ liệu có liên quan, không thêm lời văn khác.`;

    const humanPrompt = `Câu hỏi: ${question}

Hãy xác định siêu dữ liệu phù hợp để tìm tài liệu liên quan đến câu hỏi này.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(humanPrompt)
    ];

    console.log('Sending query classification request to LLM...');
    const response = await getLLM().invoke(messages);
    console.log('LLM query response received:', response.content.substring(0, 200) + '...');
    
    // Parse the response
    let metadata;
    try {
      // Try to extract JSON from response
      const jsonString = response.content.match(/\{[\s\S]*\}/)?.[0];
      console.log('JSON string extracted from query response:', jsonString);
      if (jsonString) {
        metadata = JSON.parse(jsonString);
        console.log('Parsed query metadata:', metadata);
      } else {
        console.log('No JSON found in query response, using rule-based classification');
        return ruleBasedClassifyQueryMetadata(question);
      }
    } catch (parseError) {
      console.log('JSON parsing failed for query:', parseError.message);
      // Fallback to rule-based classification if JSON parsing fails
      return ruleBasedClassifyQueryMetadata(question);
    }

    // Only return non-null values
    const result = {};
    if (metadata.user_role) result.user_role = metadata.user_role;
    if (metadata.topic) result.topic = metadata.topic;

    console.log('Final query metadata result:', result);
    return result;
  } catch (error) {
    console.error('LLM query classification failed, falling back to rule-based:', error.message);
    console.error('Query classification error details:', error);
    // Fallback to rule-based classification
    return ruleBasedClassifyQueryMetadata(question);
  }
}

/**
 * Rule-based query classification as fallback
 */
function ruleBasedClassifyQueryMetadata(question) {
  const questionLower = question.toLowerCase();
  
  const inferredMetadata = {};
  
  // Infer user_role from question
  if (
    questionLower.includes('tôi là sinh viên') || 
    questionLower.includes('tôi là người học') ||
    questionLower.includes('tôi là học viên') ||
    questionLower.includes('nhận chứng chỉ')
  ) {
    inferredMetadata.user_role = 'student';
  } else if (
    questionLower.includes('tôi là đơn vị đào tạo') ||
    questionLower.includes('tôi là tổ chức đào tạo') ||
    questionLower.includes('cấp chứng chỉ') ||
    questionLower.includes('thu hồi chứng chỉ')
  ) {
    inferredMetadata.user_role = 'training_org';
  } else if (
    questionLower.includes('tôi là nhà tuyển dụng') ||
    questionLower.includes('xác minh chứng chỉ')
  ) {
    inferredMetadata.user_role = 'verifier';
  }
  
  // Infer topic from question
  if (questionLower.includes('đăng nhập')) {
    inferredMetadata.topic = 'login';
  } else if (questionLower.includes('khóa học') || questionLower.includes('quản lý khóa học')) {
    inferredMetadata.topic = 'course_management';
  } else if (questionLower.includes('học viên') || questionLower.includes('sinh viên')) {
    inferredMetadata.topic = 'student_management';
  } else if (questionLower.includes('cấp chứng chỉ') || questionLower.includes('tạo chứng chỉ')) {
    inferredMetadata.topic = 'certificate_issue';
  } else if (questionLower.includes('nhận chứng chỉ')) {
    inferredMetadata.topic = 'certificate_receive';
  } else if (questionLower.includes('xác minh') || questionLower.includes('kiểm tra') || questionLower.includes('xác thực')) {
    inferredMetadata.topic = 'certificate_verify';
  } else if (questionLower.includes('ví') || questionLower.includes('metamask') || questionLower.includes('kết nối')) {
    inferredMetadata.topic = 'wallet';
  } else if (questionLower.includes('faq') || questionLower.includes('câu hỏi thường gặp')) {
    inferredMetadata.topic = 'faq';
  } else if (questionLower.includes('thu hồi')) {
    inferredMetadata.topic = 'certificate_issue'; // Revocation is part of issuing process
  }
  
  return inferredMetadata;
}

module.exports = {
  METADATA_SCHEMA,
  classifyChunkMetadata,
  classifyMultipleChunkMetadata,  // Export the batch function
  classifyQueryMetadata,
  // Export helper functions for debugging
  ruleBasedClassifyChunkMetadata,
  ruleBasedClassifyQueryMetadata,
  getLLM  // Export for debugging
};