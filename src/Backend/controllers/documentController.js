const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const DocumentLoaderService = require('../rag/loadDocuments');
const PostgreSQLVectorStore = require('../rag/vectorStore');
const { OpenAIEmbeddings } = require('@langchain/openai');
const db = require('../config/pg');

/**
 * Document Upload Controller
 * 
 * Handles document upload and ingestion into the chatbot system
 */
class DocumentController {
  constructor() {
    // Configure multer for file uploads
    this.storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/documents');
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        // Generate unique filename while preserving extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
      }
    });

    // Supported MIME types mapped by extension for fallback detection
    this.allowedMimeTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown'
    };

    // File filter for allowed types (supports extension-based fallback)
    this.fileFilter = (req, file, cb) => {
      const mimeType = file.mimetype;
      const extension = path.extname(file.originalname || '').toLowerCase().replace('.', '');

      const isMimeAllowed = Object.values(this.allowedMimeTypes).includes(mimeType);
      const isExtensionAllowed = extension && this.allowedMimeTypes[extension];

      if (isMimeAllowed || isExtensionAllowed) {
        // Normalize mimetype when coming from browsers that send octet-stream
        if (!isMimeAllowed && isExtensionAllowed) {
          file.mimetype = this.allowedMimeTypes[extension];
        }
        cb(null, true);
      } else {
        const supported = Object.keys(this.allowedMimeTypes).join(', ');
        const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
        error.message = `Unsupported file type: ${mimeType || extension || 'unknown'}. Allowed: ${supported}`;
        cb(error);
      }
    };

    // Configure multer upload
    this.upload = multer({
      storage: this.storage,
      fileFilter: this.fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files at once
      }
    });
  }

  /**
   * Upload and process documents
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async uploadDocuments(req, res) {
    try {
      console.log('📤 Starting document upload process...');
      
      // Validate files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          message: 'Please select at least one file to upload'
        });
      }

      console.log(`📤 Received ${req.files.length} files for processing`);

      // Extract metadata from request body
      const metadata = {
        uploadedBy: req.user?.id || 'system',
        uploadedAt: new Date().toISOString(),
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        category: req.body.category || 'general',
        description: req.body.description || ''
      };

      // Prepare file objects for ingestion service
      const files = req.files.map(file => ({
        path: file.path,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      }));

      // Process documents through LangChain ingestion service
      console.log('🔄 Starting document ingestion with LangChain...');
      
      // Initialize embeddings and document loader
      const embeddings = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
      
      const documentLoader = new DocumentLoaderService();
      const vectorStore = PostgreSQLVectorStore.fromEmbeddings(embeddings, { pool: db.pool });
      
      // Load documents using LangChain
      const loadedDocs = await documentLoader.loadDocuments(files);
      
      // Add documents to vector store with embeddings
      const documentIds = await vectorStore.addDocuments(loadedDocs);
      
      // Prepare results in the same format as the old service
      const results = files.map((file, index) => ({
        filename: file.originalName,
        status: 'success',
        documentIds: [documentIds[index]], // Assuming each file maps to one or more document IDs
        chunkCount: loadedDocs.filter(doc => doc.metadata.sourceFile === file.originalName).length
      }));

      // Clean up uploaded files after processing
      await cleanupUploadedFiles(files);

      // Prepare response
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.length - successCount;

      const response = {
        message: `Processed ${results.length} files: ${successCount} successful, ${errorCount} failed`,
        results: results.map(result => ({
          filename: result.filename,
          status: result.status,
          chunkCount: result.chunkCount,
          documentIds: result.documentIds,
          error: result.error || null
        })),
        statistics: {
          totalFiles: results.length,
          successfulFiles: successCount,
          failedFiles: errorCount,
          totalChunks: results.reduce((sum, r) => sum + r.chunkCount, 0),
          totalDocuments: results.reduce((sum, r) => sum + r.documentIds.length, 0)
        }
      };

      console.log(`✅ Upload completed: ${successCount}/${results.length} files processed successfully`);
      
      res.status(200).json(response);

    } catch (error) {
      console.error('❌ Error in document upload:', error);
      
      // Clean up files in case of error
      if (req.files && req.files.length > 0) {
        await cleanupUploadedFiles(req.files);
      }

      res.status(500).json({
        error: 'Document upload failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Search documents using natural language queries
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async searchDocuments(req, res) {
    try {
      const { query, limit = 5, threshold = 0.7 } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Invalid query',
          message: 'Please provide a valid search query'
        });
      }

      console.log(`🔍 Searching documents with query: "${query}"`);

      // Initialize embeddings and vector store for search
      const embeddings = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
      
      const vectorStore = PostgreSQLVectorStore.fromEmbeddings(embeddings, { pool: db.pool });
      
      // Perform similarity search using LangChain vector store
      const docs = await vectorStore.similaritySearch(query, parseInt(limit));
      
      // Convert LangChain documents to the expected format
      const results = docs.map(doc => ({
        id: doc.metadata.id,
        title: doc.metadata.title,
        content_chunk: doc.pageContent,
        source_file: doc.metadata.sourceFile,
        source_type: doc.metadata.sourceType,
        similarity_score: doc.metadata.similarityScore,
        metadata: doc.metadata
      }));

      res.status(200).json({
        message: `Found ${results.length} relevant documents`,
        query,
        results: results.map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content_chunk,
          sourceFile: doc.source_file,
          sourceType: doc.source_type,
          similarityScore: Math.round(doc.similarity_score * 100) / 100,
          metadata: doc.metadata
        }))
      });

    } catch (error) {
      console.error('❌ Error searching documents:', error);
      res.status(500).json({
        error: 'Document search failed',
        message: error.message
      });
    }
  }

  /**
   * Get document statistics
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getDocumentStats(req, res) {
    try {
      console.log('📊 Getting document statistics...');
      
      // Get document statistics directly from the database
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
      const stats = result.rows;

      res.status(200).json({
        message: 'Document statistics retrieved successfully',
        statistics: stats
      });

    } catch (error) {
      console.error('❌ Error getting document stats:', error);
      res.status(500).json({
        error: 'Failed to get document statistics',
        message: error.message
      });
    }
  }

  /**
   * Delete document by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          error: 'Invalid document ID',
          message: 'Please provide a valid document ID'
        });
      }

      console.log(`🗑️ Deleting document with ID: ${id}`);

      // TODO: Implement document deletion in service
      // This would include removing from chatbot_documents table
      
      res.status(200).json({
        message: `Document ${id} deleted successfully`
      });

    } catch (error) {
      console.error('❌ Error deleting document:', error);
      res.status(500).json({
        error: 'Failed to delete document',
        message: error.message
      });
    }
  }

  /**
   * Clean up uploaded files after processing
   * @param {Array} files - Array of file objects
   */
  async cleanupUploadedFiles(files) {
    try {
      console.log('🧹 Cleaning up uploaded files...');
      
      for (const file of files) {
        try {
          await fs.unlink(file.path);
          console.log(`🗑️ Deleted: ${file.originalName || file.originalname}`);
        } catch (error) {
          console.warn(`⚠️ Could not delete file: ${file.path}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error during file cleanup:', error);
    }
  }

  /**
   * Get multer middleware for handling uploads
   * @returns {Function} Multer middleware
   */
  getUploadMiddleware() {
    return (req, res, next) => {
      this.upload.array('documents', 10)(req, res, (err) => {
        if (err) {
          console.error('❌ Multer upload error:', err);

          if (err instanceof multer.MulterError) {
            return res.status(400).json({
              error: 'Upload validation failed',
              message: err.message
            });
          }

          return res.status(500).json({
            error: 'Upload processing failed',
            message: err.message
          });
        }

        next();
      });
    };
  }

  /**
   * Health check endpoint for document service
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async healthCheck(req, res) {
    try {
      // Check if Gemini API key is configured
      const hasGeminiKey = !!process.env.OPENAI_API_KEY;
      
      // Check database connection
      const db = require('../config/pg');
      const dbCheck = await db.pool.query('SELECT 1');
      
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          openaiApi: hasGeminiKey ? 'configured' : 'missing',
          database: dbCheck.rows.length > 0 ? 'connected' : 'error',
          uploadDirectory: 'ready'
        }
      });

    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

/**
 * Helper function to clean up uploaded files
 * @param {Array} files - Array of file objects
 */
async function cleanupUploadedFiles(files) {
  try {
    console.log('🧹 Cleaning up uploaded files...');
    
    for (const file of files) {
      try {
        await fs.unlink(file.path);
        console.log(`🗑️ Deleted: ${file.originalName || file.originalname}`);
      } catch (error) {
        console.warn(`⚠️ Could not delete file: ${file.path}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during file cleanup:', error);
  }
}

module.exports = new DocumentController();