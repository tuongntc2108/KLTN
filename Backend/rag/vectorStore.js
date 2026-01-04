const { Embeddings } = require('@langchain/core/embeddings');
const { Pool } = require('pg');
const db = require('../config/pg');

/**
 * Custom PostgreSQL Vector Store for LangChain
 * Implements similarity search using our existing PostgreSQL schema with vector extension
 */
class PostgreSQLVectorStore {
  constructor(embeddings, options = {}) {
    this.embeddings = embeddings;
    this.pool = options.pool || db.pool;
    this.tableName = options.tableName || 'chatbot_documents';
  }

  /**
   * Add documents to the vector store with embeddings
   * @param {Array} documents - Array of LangChain documents
   * @returns {Promise<Array>} Array of document IDs
   */
  async addDocuments(documents) {
    const documentIds = [];
    
    for (const doc of documents) {
      try {
        // Generate embedding for the document content
        const embedding = await this.embeddings.embedQuery(doc.pageContent);
        
        // Store document with embedding in PostgreSQL
        const documentId = await this.storeDocument({
          title: doc.metadata.sourceFile || 'Unknown',
          content: doc.pageContent,
          contentChunk: doc.pageContent,
          chunkIndex: doc.metadata.chunkIndex || 0,
          embedding,
          sourceFile: doc.metadata.sourceFile,
          sourceType: doc.metadata.sourceType,
          metadata: {
            ...doc.metadata
          }
        });
        
        documentIds.push(documentId);
      } catch (error) {
        console.error('❌ Error storing document:', error);
        throw error;
      }
    }
    
    return documentIds;
  }

  /**
   * Store document with embedding in database
   * @param {Object} docData - Document data
   * @returns {Promise<number>} Document ID
   */
  async storeDocument(docData) {
    try {
      const query = `
        INSERT INTO ${this.tableName} (
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
      
      const result = await this.pool.query(query, values);
      return result.rows[0].id;
      
    } catch (error) {
      console.error('❌ Error storing document:', error);
      throw new Error(`Failed to store document: ${error.message}`);
    }
  }

  /**
   * Perform similarity search using vector embeddings
   * @param {string} query - Query string
   * @param {number} k - Number of results to return
   * @param {Object} filter - Optional filter conditions
   * @returns {Promise<Array>} Array of similar documents with similarity scores
   */
  async similaritySearchVectorWithScore(query, k = 5, filter = {}) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const embeddingVector = `[${queryEmbedding.join(',')}]`;
      
      // Search for similar documents using cosine similarity
      const vectorQuery = `
        SELECT 
          id, title, content_chunk, source_file, source_type, metadata,
          1 - (embedding <=> $1::vector) as similarity_score
        FROM ${this.tableName}
        WHERE 1 - (embedding <=> $1::vector) > 0.0  -- Minimum similarity threshold
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `;
      
      const vectorResult = await this.pool.query(vectorQuery, [embeddingVector, k]);
      const results = vectorResult.rows;
      
      // Convert results to LangChain format: [document, similarity_score]
      return results.map(row => [
        {
          pageContent: row.content_chunk,
          metadata: {
            id: row.id,
            title: row.title,
            sourceFile: row.source_file,
            sourceType: row.source_type,
            similarityScore: row.similarity_score,
            ...row.metadata
          }
        },
        row.similarity_score
      ]);
      
    } catch (error) {
      console.error('❌ Error in similarity search:', error);
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }

  /**
   * Convenience method for similarity search without scores
   * @param {string} query - Query string
   * @param {number} k - Number of results to return
   * @returns {Promise<Array>} Array of similar documents
   */
  async similaritySearch(query, k = 5) {
    const results = await this.similaritySearchVectorWithScore(query, k);
    return results.map(([doc]) => doc);
  }

  /**
   * Static method to create vector store from documents
   * @param {Array} docs - Array of LangChain documents
   * @param {Object} embeddings - Embeddings instance
   * @param {Object} options - Vector store options
   * @returns {Promise<PostgreSQLVectorStore>} Vector store instance
   */
  static async fromDocuments(docs, embeddings, options = {}) {
    const vectorStore = new PostgreSQLVectorStore(embeddings, options);
    await vectorStore.addDocuments(docs);
    return vectorStore;
  }

  /**
   * Static method to create vector store from embeddings
   * @param {Object} embeddings - Embeddings instance
   * @param {Object} options - Vector store options
   * @returns {PostgreSQLVectorStore} Vector store instance
   */
  static fromEmbeddings(embeddings, options = {}) {
    return new PostgreSQLVectorStore(embeddings, options);
  }
}

module.exports = PostgreSQLVectorStore;