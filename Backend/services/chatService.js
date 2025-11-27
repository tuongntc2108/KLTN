const { GoogleGenerativeAI } = require('@google/generative-ai');
const documentIngestionService = require('./documentIngestionService');
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

class ChatService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Model name is configurable via GEMINI_MODEL env var.
    // Default to 'gemini-1.5' which is more commonly available than '-pro'.
    // If your key/account doesn't have access to a Gemini variant, set GEMINI_MODEL to a supported model (or use a text model).
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5';
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });

    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'course_management',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });
  }

  async handleChat({ message, sessionId = null }) {
    const sid = sessionId || this.generateSessionId();

    // 1. Retrieve top 3 similar document chunks
    const limit = 3;
    const threshold = 0.0; // return top N regardless of threshold
    const docs = await documentIngestionService.searchSimilarDocuments(message, limit, threshold);

    // 2. Build context
    const context = this.buildContextFromDocs(docs);

    // 3. Build prompt
    const systemPrompt = this.getSystemPrompt();
    const prompt = `${systemPrompt}

Thông tin liên quan (nhiều nhất đến ít nhất):
${context}

Hỏi: ${message}

Trả lời ngắn gọn, rõ ràng, bằng tiếng Việt. Nếu không đủ thông tin, hãy nói rõ điều đó và gợi ý bước tiếp theo.`;

    // 4. Call model.generateContent(). Use a larger token budget and add a
    // simple continuation retry when the model's reply looks truncated.
    let answer = '';
    const maxOutputTokens = parseInt(process.env.CHAT_MAX_TOKENS || '1200', 10);
    const temperature = parseFloat(process.env.CHAT_TEMPERATURE || '0.2');

    try {
      const genResult = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens,
          temperature,
        },
      });

      // Optionally dump debug info when DEBUG_CHAT=1
      if (process.env.DEBUG_CHAT === '1') {
        try { console.debug('genResult:', JSON.stringify(genResult, null, 2)); } catch (e) { console.debug('genResult (unserializable)'); }
      }

      answer = genResult.response?.text?.() || '';

      // Heuristic: if answer does not end with sentence-ending punctuation,
      // attempt up to N continuation requests to finish the response.
      const endsWithPunct = /[\.\?!][\"']?\s*$/.test(answer);
      const maxContinuations = parseInt(process.env.CHAT_MAX_CONTINUATIONS || '2', 10);
      let continuationCount = 0;

      while (answer && !endsWithPunct && continuationCount < maxContinuations) {
        continuationCount += 1;
        try {
          const contPrompt = `Tiếp tục câu trả lời trước đó (KHÔNG lặp lại phần đã trả lời). Trả lời ngắn gọn để hoàn tất câu.\n\nĐoạn trả lời trước:\n${answer}\n\nTiếp tục:`;
          const contResult = await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: contPrompt }] }],
            generationConfig: {
              maxOutputTokens: Math.min(800, Math.floor(maxOutputTokens / 2)),
              temperature,
            },
          });

          const contText = contResult.response?.text?.() || '';
          if (contText) {
            answer = `${answer.trim()}\n\n${contText.trim()}`;
            // recalc endsWithPunct for loop condition
            if (/[\.\?!][\"']?\s*$/.test(answer)) break;
          } else {
            // nothing appended, break early
            break;
          }
        } catch (contErr) {
          console.warn('Continuation attempt failed:', contErr?.message || contErr);
          break;
        }
      }
    } catch (err) {
      // If model not found / not supported, return a clear error message
      const isNotFound = err && (err.status === 404 || (err.message && /not found|not supported/i.test(err.message)));
      console.error('Generative model error:', err?.message || err);

      if (isNotFound) {
        answer = `Lỗi: model "${this.modelName}" không khả dụng cho phương thức generateContent. Vui lòng cấu hình biến môi trường GEMINI_MODEL sang một model hỗ trợ (ví dụ: 'gemini-1.5' hoặc một model text tương thích).`;
      } else {
        answer = 'Xin lỗi, có lỗi khi gọi dịch vụ AI. Vui lòng thử lại sau.';
      }
    }

    // 5. Prepare sources
    const sources = docs.map(d => ({ id: d.id, title: d.title, source_file: d.source_file, similarity: d.similarity_score || d.similarity }));

    // 6. If any URLs exist in the retrieved documents, append them clearly
    // to the answer so end-users get direct links (don't rely on "in the
    // document" language). We extract URLs from content chunks and include
    // them with a short label.
    const extractUrlsFromDocs = (docChunks) => {
      const urlRegex = /https?:\/\/[\w\-._~:\/?#\[\]@!$&'()*+,;=%]+/g;
      const urls = new Map();
      for (const d of docChunks) {
        const text = (d.content_chunk || d.content || '') + '\n' + (d.metadata ? JSON.stringify(d.metadata) : '');
        const matches = text.match(urlRegex);
        if (matches) {
          for (const u of matches) {
            // keep first seen file association
            if (!urls.has(u)) urls.set(u, d.source_file || d.title || 'document');
          }
        }
      }
      return urls; // Map url -> source
    };

    try {
      let urlsMap = extractUrlsFromDocs(docs);
      const mentionsDoc = /tài liệu|đường link|link|faucet|Sepolia/i.test(answer);

      // If no URLs found in the top-k similar docs but the answer mentions
      // document/link, try a DB-backed fallback: search recent document chunks
      // for any URLs and use them.
      if (urlsMap.size === 0 && mentionsDoc) {
        try {
          const q = `SELECT content_chunk, metadata, source_file, title FROM chatbot_documents WHERE content_chunk ~ $1 OR COALESCE(metadata::text, '') ~ $1 ORDER BY created_at DESC LIMIT 15`;
            const urlRegexForSql = "(https?:\\/\\/[\\w\\-._~:\\/\\/?#\\[\\]@!$&'()*+,;=%]+)";
          const res = await this.pool.query(q, [urlRegexForSql]);
          if (res && res.rows && res.rows.length > 0) {
            urlsMap = extractUrlsFromDocs(res.rows);
          }
        } catch (dbErr) {
          console.warn('URL fallback DB search failed:', dbErr?.message || dbErr);
        }
      }

      if (urlsMap.size > 0) {
        const containsAnyUrl = Array.from(urlsMap.keys()).some(u => answer.includes(u));
        if (!containsAnyUrl && (mentionsDoc || !answer.toLowerCase().includes('http'))) {
          // Format as markdown links so frontend converts them to anchors
          const linksList = Array.from(urlsMap.entries()).map(([url, src]) => `- [${url}](${url})  (nguồn: ${src})`).join('\n');
          answer = `${answer.trim()}\n\nLiên kết tham khảo từ tài liệu:\n${linksList}`;
        }
      }
    } catch (appendErr) {
      console.warn('Failed to append document URLs to answer:', appendErr?.message || appendErr);
    }

    // 7. Save minimal conversation record (non-blocking)
    this.saveMinimalConversation({ sessionId: sid, userMessage: message, botResponse: answer, sources }).catch(err => console.error('saveMinimalConversation error:', err));

    return { answer, sources, sessionId: sid };
  }

  buildContextFromDocs(docs) {
    if (!docs || docs.length === 0) return 'Không tìm thấy tài liệu liên quan.';

    return docs.map((d, i) => `${i + 1}. [id:${d.id}] ${d.title} - ${d.source_file}\n${d.content_chunk}`).join('\n\n');
  }

  getSystemPrompt() {
    return `Bạn là trợ lý kỹ thuật viên hỗ trợ người dùng về hệ thống quản lý khóa học và chứng chỉ. Dùng thông tin cung cấp để trả lời chính xác. Nếu không đủ thông tin, nói rõ vậy và gợi ý bước tiếp theo.`;
  }

  generateSessionId() {
    return randomUUID();
  }

  async saveMinimalConversation({ sessionId, userMessage, botResponse, sources }) {
    try {
      const q = `INSERT INTO chatbot_conversations (session_id, user_message, bot_response, context_documents, created_at) VALUES ($1,$2,$3,$4,NOW())`;
      await this.pool.query(q, [sessionId, userMessage, botResponse, JSON.stringify(sources)]);
    } catch (err) {
      console.error('Error saving minimal conversation:', err.message);
    }
  }
}

module.exports = ChatService;
