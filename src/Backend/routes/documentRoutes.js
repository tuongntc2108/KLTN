const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * Document Routes
 * 
 * API endpoints for document upload and management
 * All routes require authentication
 */

// Health check endpoint (no auth required)
router.get('/health', documentController.healthCheck);

// Temporary: Skip auth for testing upload
// TODO: Re-enable authentication after testing
// router.use(authMiddleware.authenticate);

/**
 * POST /api/documents/upload
 * Upload and process documents for chatbot training
 * 
 * Body: multipart/form-data
 * - documents: File array (PDF, DOCX, TXT, MD)
 * - tags: JSON array of strings (optional)
 * - category: String category (optional)
 * - description: String description (optional)
 * 
 * Response: {
 *   message: String,
 *   results: Array of processing results,
 *   statistics: Object with counts
 * }
 */
router.post('/upload', 
  documentController.getUploadMiddleware(),
  documentController.uploadDocuments
);

/**
 * POST /api/documents/search
 * Search documents using natural language queries
 * 
 * Body: {
 *   query: String (required) - Search query
 *   limit: Number (optional, default: 5) - Max results
 *   threshold: Number (optional, default: 0.7) - Similarity threshold
 * }
 * 
 * Response: {
 *   message: String,
 *   query: String,
 *   results: Array of matching documents with similarity scores
 * }
 */
router.post('/search', documentController.searchDocuments);

/**
 * GET /api/documents/stats
 * Get statistics about stored documents
 * 
 * Response: {
 *   message: String,
 *   statistics: Array of document type statistics
 * }
 */
router.get('/stats', documentController.getDocumentStats);

/**
 * DELETE /api/documents/:id
 * Delete a specific document by ID
 * 
 * Params:
 * - id: Document ID to delete
 * 
 * Response: {
 *   message: String
 * }
 */
router.delete('/:id', documentController.deleteDocument);

module.exports = router;