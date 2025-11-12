const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { Pool } = require('pg');

class DocumentEmbeddingService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
        
        // Database connection
        this.pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'course_management',
            password: process.env.DB_PASSWORD || 'postgres',
            port: process.env.DB_PORT || 5432,
        });
    }

    /**
     * Process uploaded file and generate embeddings
     */
    async processUploadedFile(uploadRecord) {
        try {
            console.log('Processing file:', uploadRecord.original_filename);
            
            // Update status to processing
            await this.updateUploadStatus(uploadRecord.id, 'processing');
            
            // Extract text content from file
            const content = await this.extractTextFromFile(uploadRecord.file_path, uploadRecord.file_extension);
            
            // Split content into chunks for better processing
            const chunks = this.splitIntoChunks(content, 1000, 200); // 1000 chars with 200 overlap
            
            let documentCount = 0;
            
            // Process each chunk
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (chunk.trim().length < 50) continue; // Skip very short chunks
                
                try {
                    // Generate embedding for chunk
                    const embedding = await this.generateEmbedding(chunk);
                    
                    // Store document chunk with embedding
                    await this.storeDocumentChunk({
                        title: uploadRecord.original_filename,
                        content: content, // Full content
                        content_chunk: chunk, // Chunk content
                        chunk_index: i,
                        embedding: embedding,
                        source_file: uploadRecord.original_filename,
                        source_type: uploadRecord.file_extension,
                        metadata: {
                            upload_id: uploadRecord.id,
                            total_chunks: chunks.length,
                            file_size: uploadRecord.file_size
                        }
                    });
                    
                    documentCount++;
                    console.log(`Processed chunk ${i + 1}/${chunks.length} for ${uploadRecord.original_filename}`);
                    
                } catch (embeddingError) {
                    console.error(`Error processing chunk ${i}:`, embeddingError);
                    // Continue with other chunks
                }
                
                // Small delay to avoid rate limiting
                await this.sleep(100);
            }
            
            // Update upload record as completed
            await this.updateUploadStatus(uploadRecord.id, 'completed', null, documentCount);
            
            console.log(`Successfully processed ${documentCount} chunks for ${uploadRecord.original_filename}`);
            return { success: true, documentCount };
            
        } catch (error) {
            console.error('Error processing file:', error);
            await this.updateUploadStatus(uploadRecord.id, 'failed', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Extract text content from different file types
     */
    async extractTextFromFile(filePath, extension) {
        const ext = extension.toLowerCase();
        
        try {
            if (ext === '.pdf') {
                const dataBuffer = await fs.readFile(filePath);
                const data = await pdf(dataBuffer);
                return data.text;
            }
            
            if (ext === '.docx') {
                const result = await mammoth.extractRawText({ path: filePath });
                return result.value;
            }
            
            if (['.txt', '.md', '.json'].includes(ext)) {
                const content = await fs.readFile(filePath, 'utf-8');
                return content;
            }
            
            throw new Error(`Unsupported file type: ${ext}`);
            
        } catch (error) {
            console.error('Error extracting text from file:', error);
            throw error;
        }
    }

    /**
     * Split text into overlapping chunks
     */
    splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
        const chunks = [];
        const words = text.split(' ');
        
        for (let i = 0; i < words.length; i += chunkSize - overlap) {
            const chunk = words.slice(i, i + chunkSize).join(' ');
            if (chunk.trim().length > 0) {
                chunks.push(chunk);
            }
        }
        
        return chunks;
    }

    /**
     * Generate embedding for text using Gemini
     */
    async generateEmbedding(text) {
        try {
            const result = await this.embeddingModel.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    /**
     * Store document chunk with embedding in database
     */
    async storeDocumentChunk(documentData) {
        const query = `
            INSERT INTO chatbot_documents (
                title, content, content_chunk, chunk_index, embedding,
                source_file, source_type, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;
        
        const values = [
            documentData.title,
            documentData.content,
            documentData.content_chunk,
            documentData.chunk_index,
            JSON.stringify(documentData.embedding), // Store as JSON for now
            documentData.source_file,
            documentData.source_type,
            documentData.metadata
        ];
        
        try {
            const result = await this.pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            console.error('Error storing document chunk:', error);
            throw error;
        }
    }

    /**
     * Update upload status
     */
    async updateUploadStatus(uploadId, status, error = null, documentCount = 0) {
        const query = `
            UPDATE chatbot_uploads 
            SET upload_status = $2, 
                processing_error = $3,
                document_count = $4,
                processed_at = CASE WHEN $2 IN ('completed', 'failed') THEN NOW() ELSE processed_at END
            WHERE id = $1
        `;
        
        await this.pool.query(query, [uploadId, status, error, documentCount]);
    }

    /**
     * Search for similar documents using vector similarity
     */
    async searchSimilarDocuments(queryText, limit = 5, threshold = 0.7) {
        try {
            // Generate embedding for query
            const queryEmbedding = await this.generateEmbedding(queryText);
            
            // Search for similar documents
            const query = `
                SELECT 
                    id, title, content_chunk, source_file, source_type, metadata,
                    (embedding <-> $1::vector) as distance
                FROM chatbot_documents
                WHERE (embedding <-> $1::vector) < $2
                ORDER BY embedding <-> $1::vector
                LIMIT $3
            `;
            
            const result = await this.pool.query(query, [
                JSON.stringify(queryEmbedding),
                1 - threshold, // Convert similarity to distance
                limit
            ]);
            
            return result.rows.map(row => ({
                ...row,
                similarity: 1 - row.distance, // Convert distance back to similarity
                metadata: row.metadata || {}
            }));
            
        } catch (error) {
            console.error('Error searching similar documents:', error);
            throw error;
        }
    }

    /**
     * Add manual document (without file upload)
     */
    async addManualDocument(title, content, sourceType = 'manual') {
        try {
            // Split into chunks
            const chunks = this.splitIntoChunks(content, 1000, 200);
            const documentIds = [];
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (chunk.trim().length < 50) continue;
                
                const embedding = await this.generateEmbedding(chunk);
                
                const id = await this.storeDocumentChunk({
                    title,
                    content,
                    content_chunk: chunk,
                    chunk_index: i,
                    embedding,
                    source_file: null,
                    source_type: sourceType,
                    metadata: {
                        total_chunks: chunks.length,
                        manual_entry: true
                    }
                });
                
                documentIds.push(id);
                await this.sleep(100);
            }
            
            return { success: true, documentIds, chunkCount: documentIds.length };
            
        } catch (error) {
            console.error('Error adding manual document:', error);
            throw error;
        }
    }

    /**
     * Get chatbot configuration
     */
    async getConfig(key) {
        try {
            const query = 'SELECT config_value FROM chatbot_config WHERE config_key = $1';
            const result = await this.pool.query(query, [key]);
            
            if (result.rows.length > 0) {
                return result.rows[0].config_value;
            }
            return null;
        } catch (error) {
            console.error('Error getting config:', error);
            throw error;
        }
    }

    /**
     * Update chatbot configuration
     */
    async updateConfig(key, value, updatedBy = 'system') {
        try {
            const query = `
                INSERT INTO chatbot_config (config_key, config_value, updated_by)
                VALUES ($1, $2, $3)
                ON CONFLICT (config_key)
                DO UPDATE SET config_value = $2, updated_by = $3, updated_at = NOW()
            `;
            
            await this.pool.query(query, [key, value, updatedBy]);
            return true;
        } catch (error) {
            console.error('Error updating config:', error);
            throw error;
        }
    }

    /**
     * Utility function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get upload statistics
     */
    async getUploadStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_uploads,
                    SUM(CASE WHEN upload_status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN upload_status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN upload_status = 'processing' THEN 1 ELSE 0 END) as processing,
                    SUM(document_count) as total_documents
                FROM chatbot_uploads
            `;
            
            const result = await this.pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Error getting upload stats:', error);
            throw error;
        }
    }
}

module.exports = DocumentEmbeddingService;