const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/pg');

// Import PDF and DOCX parsers with error handling
let pdfParse;
let mammoth;

try {
  const pdfModule = require('pdf-parse');
  pdfParse = pdfModule.default || pdfModule;
  console.log('✅ PDF parser loaded successfully');
} catch (error) {
  console.error('❌ Failed to load PDF parser:', error.message);
}

try {
  const mammothModule = require('mammoth');
  mammoth = mammothModule.default || mammothModule;
  console.log('✅ Mammoth DOCX parser loaded successfully');
} catch (error) {
  console.error('❌ Failed to load DOCX parser:', error.message);
}



/**
 * Document Ingestion Service
 * 
 * Handles document processing pipeline:
 * 1. Read various file formats (PDF, DOCX, TXT)
 * 2. Clean and normalize text content
 * 3. Split text into manageable chunks
 * 4. Generate embeddings using Gemini AI
 * 5. Store documents with embeddings in PostgreSQL
 */
class DocumentIngestionService {
  constructor() {
    // Initialize Gemini AI with text embedding model
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ 
      model: "text-embedding-004" 
    });
    
    // Configuration for text processing
    this.config = {
      chunkSize: 400, // Target words per chunk (300-500 range)
      chunkOverlap: 50, // Words to overlap between chunks
      maxFileSize: 10 * 1024 * 1024, // 10MB max file size
      supportedTypes: ['pdf', 'docx', 'txt', 'md'],
      batchSize: 10 // Number of embeddings to process in parallel
    };
  }

  /**
   * Process multiple files and store in database
   * @param {Array} files - Array of file objects with { path, originalName, mimetype }
   * @param {Object} metadata - Additional metadata for the documents
   * @returns {Promise<Array>} Array of processed document IDs
   */
  async ingestDocuments(files, metadata = {}) {
    const results = [];
    
    try {
      console.log(`📁 Starting ingestion of ${files.length} files`);
      
      for (const file of files) {
        console.log(`📄 Processing file: ${file.originalName}`);
        
        try {
          // Validate file
          await this.validateFile(file);
          
          // Extract text content from file
          const content = await this.extractTextFromFile(file);
          
          // Clean and normalize text
          const cleanContent = this.cleanText(content);
          
          // Split into chunks
          const chunks = this.splitTextIntoChunks(cleanContent);
          
          console.log(`✂️ Split into ${chunks.length} chunks`);
          
          // Process chunks in batches
          const documentIds = await this.processChunksInBatches(
            chunks, 
            file, 
            metadata
          );
          
          results.push({
            filename: file.originalName,
            status: 'success',
            documentIds,
            chunkCount: chunks.length
          });
          
          console.log(`✅ Successfully processed ${file.originalName}`);
          
        } catch (error) {
          console.error(`❌ Error processing ${file.originalName}:`, error.message);
          results.push({
            filename: file.originalName,
            status: 'error',
            error: error.message,
            documentIds: [],
            chunkCount: 0
          });
        }
      }
      
      console.log(`🎉 Completed ingestion. Processed ${results.length} files`);
      return results;
      
    } catch (error) {
      console.error('❌ Fatal error in document ingestion:', error);
      throw error;
    }
  }

  /**
   * Validate file before processing
   * @param {Object} file - File object
   */
  async validateFile(file) {
    // Check file size
    const stats = await fs.stat(file.path);
    if (stats.size > this.config.maxFileSize) {
      throw new Error(`File too large: ${Math.round(stats.size / 1024 / 1024)}MB (max: ${this.config.maxFileSize / 1024 / 1024}MB)`);
    }

    // Check file type
    const extension = path.extname(file.originalName).toLowerCase().substring(1);
    if (!this.config.supportedTypes.includes(extension)) {
      throw new Error(`Unsupported file type: ${extension}. Supported: ${this.config.supportedTypes.join(', ')}`);
    }

    console.log(`✓ File validation passed: ${file.originalName} (${Math.round(stats.size / 1024)}KB)`);
  }

  /**
   * Extract text content from different file types
   * @param {Object} file - File object
   * @returns {Promise<string>} Extracted text content
   */
  async extractTextFromFile(file) {
    const extension = path.extname(file.originalName).toLowerCase().substring(1);
    
    try {
      switch (extension) {
        case 'pdf':
          return await this.extractFromPDF(file.path);
          
        case 'docx':
          return await this.extractFromDOCX(file.path);
          
        case 'txt':
        case 'md':
          return await this.extractFromTXT(file.path);
          
        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      throw new Error(`Failed to extract text from ${extension.toUpperCase()}: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<string>} Extracted text
   */
  async extractFromPDF(filePath) {
    console.log('📖 Extracting text from PDF...');
    
    if (!pdfParse) {
      throw new Error('PDF parser not available. Please install pdf-parse module.');
    }
    
    try {
      const dataBuffer = await fs.readFile(filePath);
      console.log(`📖 Read PDF file: ${dataBuffer.length} bytes`);
      
      // Call pdfParse function
      const data = await pdfParse(dataBuffer);
      
      if (!data || !data.text || data.text.trim().length === 0) {
        throw new Error('No text content found in PDF');
      }
      
      console.log(`📖 Extracted ${data.text.length} characters from PDF`);
      return data.text;
      
    } catch (error) {
      console.error('❌ PDF parsing error:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX file
   * @param {string} filePath - Path to DOCX file
   * @returns {Promise<string>} Extracted text
   */
  async extractFromDOCX(filePath) {
    console.log('📝 Extracting text from DOCX...');
    
    if (!mammoth) {
      throw new Error('DOCX parser not available. Please install mammoth module.');
    }
    
    try {
      const dataBuffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('No text content found in DOCX');
      }
      
      console.log(`📝 Extracted ${result.value.length} characters from DOCX`);
      return result.value;
      
    } catch (error) {
      console.error('❌ DOCX parsing error:', error);
      throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
  }

  /**
   * Extract text from TXT/MD file
   * @param {string} filePath - Path to text file
   * @returns {Promise<string>} File content
   */
  async extractFromTXT(filePath) {
    console.log('📄 Reading text file...');
    const content = await fs.readFile(filePath, 'utf-8');
    
    if (!content || content.trim().length === 0) {
      throw new Error('No text content found in file');
    }
    
    console.log(`📄 Read ${content.length} characters from text file`);
    return content;
  }

  /**
   * Clean and normalize text content
   * @param {string} text - Raw text content
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    console.log('🧹 Cleaning text content...');
    console.log(`📝 Original text length: ${text.length} characters`);
    
    const cleaned = text
      // Remove excessive whitespace but preserve single spaces
      .replace(/\s+/g, ' ')
      // Remove excessive line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Trim whitespace
      .trim();
    
    console.log(`📝 Cleaned text length: ${cleaned.length} characters`);
    console.log(`📝 First 200 chars: ${cleaned.substring(0, 200)}...`);
    
    return cleaned;
  }

  /**
   * Split text into manageable chunks
   * @param {string} text - Clean text content
   * @returns {Array<string>} Array of text chunks
   */
  splitTextIntoChunks(text) {
    console.log('✂️ Splitting text into chunks...');
    
    const words = text.split(/\s+/).filter(word => word.trim().length > 0);
    const chunks = [];
    
    // If text is very small (less than chunk size), create one chunk
    if (words.length <= this.config.chunkSize) {
      const singleChunk = words.join(' ').trim();
      if (singleChunk.length > 10) { // Very minimum threshold
        chunks.push(singleChunk);
        console.log(`✂️ Created 1 chunk from ${words.length} words (small document)`);
        return chunks;
      }
    }
    
    let currentChunk = [];
    let wordCount = 0;
    
    for (let i = 0; i < words.length; i++) {
      currentChunk.push(words[i]);
      wordCount++;
      
      // Check if we should create a new chunk
      if (wordCount >= this.config.chunkSize || i === words.length - 1) {
        const chunkText = currentChunk.join(' ').trim();
        
        // Add chunks with substantial content (reduced minimum from 50 to 10 chars)
        if (chunkText.length > 10) {
          chunks.push(chunkText);
        }
        
        // Start new chunk with overlap
        const overlapStart = Math.max(0, currentChunk.length - this.config.chunkOverlap);
        currentChunk = currentChunk.slice(overlapStart);
        wordCount = currentChunk.length;
      }
    }
    
    console.log(`✂️ Created ${chunks.length} chunks from ${words.length} words`);
    return chunks;
  }

  /**
   * Process chunks in batches to generate embeddings and store in DB
   * @param {Array<string>} chunks - Array of text chunks
   * @param {Object} file - Original file info
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Array<number>>} Array of document IDs
   */
  async processChunksInBatches(chunks, file, metadata) {
    const documentIds = [];
    
    for (let i = 0; i < chunks.length; i += this.config.batchSize) {
      const batch = chunks.slice(i, i + this.config.batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / this.config.batchSize) + 1}/${Math.ceil(chunks.length / this.config.batchSize)}`);
      
      const batchIds = await this.processBatch(batch, file, metadata, i);
      documentIds.push(...batchIds);
    }
    
    return documentIds;
  }

  /**
   * Process a batch of chunks
   * @param {Array<string>} batch - Batch of text chunks
   * @param {Object} file - Original file info
   * @param {Object} metadata - Additional metadata
   * @param {number} startIndex - Starting chunk index
   * @returns {Promise<Array<number>>} Array of document IDs
   */
  async processBatch(batch, file, metadata, startIndex) {
    const documentIds = [];
    
    // Generate embeddings for batch
    const embeddings = await this.generateEmbeddingsBatch(batch);
    
    // Store each chunk with its embedding
    for (let i = 0; i < batch.length; i++) {
      const chunkIndex = startIndex + i;
      const chunk = batch[i];
      const embedding = embeddings[i];
      
      const documentId = await this.storeDocument({
        title: file.originalName,
        content: chunk,
        contentChunk: chunk,
        chunkIndex,
        embedding,
        sourceFile: file.originalName,
        sourceType: path.extname(file.originalName).substring(1).toLowerCase(),
        metadata: {
          ...metadata,
          originalSize: chunk.length,
          wordCount: chunk.split(/\s+/).length
        }
      });
      
      documentIds.push(documentId);
    }
    
    return documentIds;
  }

  /**
   * Generate embeddings for a batch of text chunks
   * @param {Array<string>} texts - Array of text chunks
   * @returns {Promise<Array<Array<number>>>} Array of embedding vectors
   */
  async generateEmbeddingsBatch(texts) {
    console.log(`🧠 Generating embeddings for ${texts.length} text chunks...`);
    
    try {
      const embeddings = [];
      
      // Process each text individually for better error handling
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        console.log(`🧠 Generating embedding ${i + 1}/${texts.length}...`);
        
        try {
          const result = await this.embeddingModel.embedContent(text);
          embeddings.push(result.embedding.values);
          
          // Small delay to respect rate limits
          if (i < texts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`❌ Error generating embedding for chunk ${i + 1}:`, error.message);
          // Use zero vector as fallback
          embeddings.push(new Array(768).fill(0));
        }
      }
      
      console.log(`✅ Generated ${embeddings.length} embeddings`);
      return embeddings;
      
    } catch (error) {
      console.error('❌ Error in batch embedding generation:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Store document with embedding in database
   * @param {Object} docData - Document data
   * @returns {Promise<number>} Document ID
   */
  async storeDocument(docData) {
    try {
      const query = `
        INSERT INTO chatbot_documents (
          title, content, content_chunk, chunk_index, embedding,
          source_file, source_type, metadata, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
        ) RETURNING id
      `;
      
      const values = [
        docData.title,
        docData.content,
        docData.contentChunk,
        docData.chunkIndex,
        `[${docData.embedding.join(',')}]`, // Format vector for PostgreSQL
        docData.sourceFile,
        docData.sourceType,
        JSON.stringify(docData.metadata)
      ];
      
      const result = await db.pool.query(query, values);
      return result.rows[0].id;
      
    } catch (error) {
      console.error('❌ Error storing document:', error);
      throw new Error(`Failed to store document: ${error.message}`);
    }
  }

  /**
   * Search for similar documents using vector similarity
   * @param {string} queryText - Search query
   * @param {number} limit - Maximum number of results
   * @param {number} threshold - Similarity threshold (0-1)
   * @returns {Promise<Array>} Similar documents
   */
  async searchSimilarDocuments(queryText, limit = 5, threshold = 0.7) {
    try {
      const normalizedQuery = this.normalizeTextForSearch(queryText);
      const expandedQuery = this.expandQueryWithSynonyms(queryText);
      const normalizedThreshold = Math.min(threshold, 0.5);

      // Generate embedding for query (with synonym expansion)
      const queryEmbedding = await this.embeddingModel.embedContent(expandedQuery);
      const embeddingVector = `[${queryEmbedding.embedding.values.join(',')}]`;
      
      // Search for similar documents using cosine similarity
      const vectorQuery = `
        SELECT 
          id, title, content_chunk, source_file, source_type, metadata,
          1 - (embedding <=> $1::vector) as similarity_score
        FROM chatbot_documents 
        WHERE 1 - (embedding <=> $1::vector) > $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
      `;
      
      const vectorResult = await db.pool.query(vectorQuery, [embeddingVector, normalizedThreshold, limit]);
      let results = vectorResult.rows;

      if (results.length >= limit) {
        return results;
      }

      const keywords = this.extractKeywords(normalizedQuery);
      const slotsRemaining = limit - results.length;

      if (slotsRemaining > 0 && keywords.length > 0) {
        const keywordFallback = await this.keywordFallbackSearch(keywords, slotsRemaining);
        results = results.concat(keywordFallback);
      }

      if (results.length > limit) {
        results = results.slice(0, limit);
      }

      return results;
      
    } catch (error) {
      console.error('❌ Error searching documents:', error);
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }

  expandQueryWithSynonyms(queryText = '') {
    const normalized = this.normalizeTextForSearch(queryText);
    const expansions = [];

    const rules = [
      {
        keywords: ['chung chi', 'chứng chỉ', 'certificate'],
        expansions: [
          'hướng dẫn nhận chứng chỉ',
          'cấp chứng chỉ NFT',
          'claim SBT',
          'nhận certificate cho học viên',
          'quy trình nhận chứng chỉ'
        ]
      },
      {
        keywords: ['nhan', 'nhận', 'nhan duoc'],
        expansions: [
          'cách nhận',
          'hướng dẫn nhận',
          'làm sao để nhận',
          'thủ tục nhận'
        ]
      },
      {
        keywords: ['metamask', 'vi', 'ví', 'wallet'],
        expansions: [
          'kết nối metamask',
          'nạp tiền metamask',
          'faucet metamask',
          'sepolia testnet wallet'
        ]
      },
      {
        keywords: ['nap tien', 'nạp tiền', 'faucet', 'sepolia', 'eth'],
        expansions: [
          'cách nạp SepoliaETH',
          'lấy Sepolia faucet',
          'nhận ETH testnet',
          'fund metamask wallet'
        ]
      }
    ];

    for (const rule of rules) {
      const matched = rule.keywords.some(keyword => normalized.includes(keyword));
      if (matched) {
        expansions.push(...rule.expansions);
      }
    }

    const uniqueExpansions = [...new Set(expansions)];
    if (uniqueExpansions.length === 0) {
      return queryText;
    }

    return `${queryText}\n${uniqueExpansions.join(' ')}`;
  }

  normalizeTextForSearch(text = '') {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u0041-\u024f\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractKeywords(normalizedText) {
    if (!normalizedText) return [];

    const words = normalizedText.split(' ');
    const seen = new Set();
    const keywords = [];

    for (const word of words) {
      if (word.length <= 2) continue;
      if (seen.has(word)) continue;
      seen.add(word);
      keywords.push(word);
      if (keywords.length >= 6) break;
    }

    return keywords;
  }

  async keywordFallbackSearch(keywords, limit) {
    if (limit <= 0 || keywords.length === 0) {
      return [];
    }

    const conditions = keywords.map((_, idx) => `content_chunk ILIKE $${idx + 1}`).join(' OR ');
    const query = `
      SELECT
        id, title, content_chunk, source_file, source_type, metadata,
        0.45 as similarity_score
      FROM chatbot_documents
      WHERE ${conditions}
      ORDER BY updated_at DESC
      LIMIT $${keywords.length + 1}
    `;

    const values = keywords.map(keyword => `%${keyword}%`);
    values.push(limit);

    const result = await db.pool.query(query, values);
    return result.rows;
  }

  /**
   * Get document statistics
   * @returns {Promise<Object>} Statistics about stored documents
   */
  async getDocumentStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT source_file) as unique_files,
          AVG(LENGTH(content_chunk)) as avg_chunk_length,
          MIN(created_at) as oldest_document,
          MAX(created_at) as newest_document,
          source_type,
          COUNT(*) as count_by_type
        FROM chatbot_documents
        GROUP BY source_type
        ORDER BY count_by_type DESC
      `;
      
      const result = await db.pool.query(query);
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error getting document stats:', error);
      throw error;
    }
  }
}

module.exports = new DocumentIngestionService();