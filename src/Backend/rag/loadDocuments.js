const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { MarkdownHeaderTextSplitter } = require('@langchain/textsplitters');
const { classifyChunkMetadata, classifyMultipleChunkMetadata } = require('./metadataClassification');

// Dynamically import document loaders based on file type
async function getDocumentLoader(fileType, filePath) {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      const { PDFLoader } = await import('@langchain/community/document_loaders/fs/pdf');
      return new PDFLoader(filePath, { splitPages: true });
      
    case 'docx':
      try {
        // Try to import DocxLoader from the standard path
        const { DocxLoader } = await import('@langchain/community/document_loaders/fs/docx');
        return new DocxLoader(filePath);
      } catch (error) {
        // Fallback: treat DOCX as text by converting with alternative loader
        console.log(`⚠️ DocxLoader not available, using UnstructuredLoader as fallback for DOCX`);
        try {
          const { UnstructuredLoader } = await import('@langchain/community/document_loaders/fs/unstructured');
          return new UnstructuredLoader(filePath);
        } catch (fallbackError) {
          // Final fallback: just read the file as text
          console.log(`⚠️ UnstructuredLoader not available, reading DOCX as raw text`);
          const { TextLoader } = await import('@langchain/community/document_loaders/fs/text');
          return new TextLoader(filePath);
        }
      }
      
    case 'txt':
    case 'md':
      const { TextLoader } = await import('@langchain/community/document_loaders/fs/text');
      return new TextLoader(filePath);
      
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Document Loader Service using LangChain
 * Handles loading various document formats and splitting into chunks
 */
class DocumentLoaderService {
  constructor() {
    // Configuration for text processing
    this.config = {
      chunkSize: 300, // Target characters per chunk
      chunkOverlap: 50, // Characters to overlap between chunks
      maxFileSize: 10 * 1024 * 1024, // 10MB max file size
      supportedTypes: ['pdf', 'docx', 'txt', 'md'],
      batchSize: 10 // Number of documents to process in parallel
    };
  }

  /**
   * Load and process documents using LangChain loaders
   * @param {Array} files - Array of file objects with { path, originalName, mimetype }
   * @returns {Promise<Array>} Array of processed documents with metadata
   */
  async loadDocuments(files) {
    const documents = [];
    
    console.log(`📁 Starting loading of ${files.length} files`);
    
    for (const file of files) {
      console.log(`📄 Processing file: ${file.originalName}`);
      
      try {
        // Validate file
        await this.validateFile(file);
        
        // Load document based on file type
        const loadedDocs = await this.loadDocumentByType(file);
        
        // Prepare chunks for batch classification
        const chunksToClassify = loadedDocs.map(doc => ({
          content: doc.pageContent,
          title: doc.metadata.title || file.originalName
        }));
        
        // Classify all chunks in batch
        const allChunkMetadata = await classifyMultipleChunkMetadata(chunksToClassify);
        
        // Add metadata to documents
        const docsWithMetadata = loadedDocs.map((doc, index) => {
          const chunkMetadata = allChunkMetadata[index];
          
          return {
            ...doc,
            metadata: {
              ...doc.metadata,
              sourceFile: file.originalName,
              sourceType: this.getFileExtension(file.originalName).toLowerCase(),
              originalSize: doc.pageContent.length,
              wordCount: doc.pageContent.split(/\s+/).length,
              // Add business metadata
              user_role: chunkMetadata.user_role,
              section: chunkMetadata.section,
              topic: chunkMetadata.topic,
              action: chunkMetadata.action,
              chunkTitle: chunkMetadata.title
            }
          };
        });
        
        documents.push(...docsWithMetadata);
        console.log(`✅ Successfully loaded ${loadedDocs.length} chunks from ${file.originalName}`);
      } catch (error) {
        console.error(`❌ Error loading ${file.originalName}:`, error.message);
        throw error;
      }
    }
    
    console.log(`🎉 Completed document loading. Loaded ${documents.length} document chunks`);
    return documents;
  }

  /**
   * Validate file before processing
   * @param {Object} file - File object
   */
  async validateFile(file) {
    const fs = require('fs').promises;
    const stats = await fs.stat(file.path);
    
    if (stats.size > this.config.maxFileSize) {
      throw new Error(`File too large: ${Math.round(stats.size / 1024 / 1024)}MB (max: ${this.config.maxFileSize / 1024 / 1024}MB)`);
    }

    const extension = this.getFileExtension(file.originalName).toLowerCase();
    if (!this.config.supportedTypes.includes(extension)) {
      throw new Error(`Unsupported file type: ${extension}. Supported: ${this.config.supportedTypes.join(', ')}`);
    }

    console.log(`✓ File validation passed: ${file.originalName} (${Math.round(stats.size / 1024)}KB)`);
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Original filename
   * @returns {string} File extension without dot
   */
  getFileExtension(filename) {
    return require('path').extname(filename).substring(1);
  }

  /**
   * Load document based on its type using appropriate LangChain loader
   * @param {Object} file - File object with path and originalName
   * @returns {Promise<Array>} Array of LangChain documents
   */
  async loadDocumentByType(file) {
    const extension = this.getFileExtension(file.originalName).toLowerCase();
    
    // Get the appropriate loader for the file type
    const loader = await getDocumentLoader(extension, file.path);
    
    // Load the documents
    const loadedDocs = await loader.load();
    
    let splitDocs = [];
    
    // For Markdown and Text files, try to split by headers/sections
    if (extension === 'md' || extension === 'txt') {
      console.log(`🏷️ Attempting to split ${extension.toUpperCase()} by sections/headings...`);
      splitDocs = await this.splitBySection(loadedDocs);
    } else {
      // For PDF, DOCX, use regular character-based splitting
      console.log(`⛓️ Using character-based splitting for ${extension.toUpperCase()}...`);
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.config.chunkSize,
        chunkOverlap: this.config.chunkOverlap,
      });
      splitDocs = await splitter.splitDocuments(loadedDocs);
    }
    
    console.log(`✂️ Split into ${splitDocs.length} chunks`);
    return splitDocs;
  }

  /**
   * Split documents by markdown headers and sections
   * @param {Array} docs - Array of documents to split
   * @returns {Promise<Array>} Array of documents split by sections
   */
  async splitBySection(docs) {
    try {
      const splitter = new MarkdownHeaderTextSplitter({
        headers_to_split_on: [
          { level: 1, name: "Header 1" },
          { level: 2, name: "Header 2" },
          { level: 3, name: "Header 3" },
        ]
      });

      let allSplitDocs = [];
      
      for (const doc of docs) {
        try {
          const sectionDocs = await splitter.splitText(doc.pageContent);
          
          // Add back original metadata and enhance with section info
          const docsWithMetadata = sectionDocs.map((sectionDoc, index) => ({
            pageContent: sectionDoc.pageContent,
            metadata: {
              ...doc.metadata,
              ...sectionDoc.metadata,
              sectionIndex: index,
              sectionSize: sectionDoc.pageContent.length
            }
          }));
          
          allSplitDocs.push(...docsWithMetadata);
          console.log(`   📚 Section "${sectionDoc.metadata['Header 1'] || 'Root'}" → ${sectionDoc.pageContent.length} chars`);
        } catch (error) {
          console.log(`   ⚠️ Section splitting failed for chunk, falling back to character split`);
          // Fallback to character-based splitting if section splitting fails
          const fallbackSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: this.config.chunkSize,
            chunkOverlap: this.config.chunkOverlap,
          });
          const fallbackDocs = await fallbackSplitter.splitDocuments([doc]);
          allSplitDocs.push(...fallbackDocs);
        }
      }
      
      return allSplitDocs;
    } catch (error) {
      console.log(`⚠️ Section splitting failed overall, falling back to character split`);
      // Final fallback: use character-based splitting
      const fallbackSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.config.chunkSize,
        chunkOverlap: this.config.chunkOverlap,
      });
      return await fallbackSplitter.splitDocuments(docs);
    }
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
      .replace(/\s*\s*/g, ' ')
      // Trim whitespace
      .trim();
    
    console.log(`📝 Cleaned text length: ${cleaned.length} characters`);
    console.log(`📝 First 200 chars: ${cleaned.substring(0, 200)}...`);
    
    return cleaned;
  }
}

module.exports = DocumentLoaderService;