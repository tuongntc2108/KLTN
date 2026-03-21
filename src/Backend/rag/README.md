# LangChain RAG Implementation

This directory contains the new RAG (Retrieval-Augmented Generation) implementation using LangChain JS, replacing the previous custom-built solution.

## Architecture

The implementation consists of 3 main components:

### 1. Document Loader (`loadDocuments.js`)
- Uses LangChain's built-in document loaders for various formats (PDF, DOCX, TXT, MD)
- Implements text splitting with configurable chunk size and overlap
- Handles file validation and metadata extraction

### 2. Vector Store (`vectorStore.js`)
- Custom PostgreSQL vector store implementation
- Works with our existing PostgreSQL schema and pgvector extension
- Implements similarity search using cosine similarity
- Compatible with LangChain's vector store interface

### 3. RAG Chain (`ragChain.js`)
- Creates the complete RAG pipeline using LangChain runnables
- Implements proper prompt engineering with context formatting
- Handles document retrieval and response generation
- Includes error handling and fallback responses

## API Integration

### Chat Endpoint
- **Route**: `POST /api/chat`
- **Input**: `{ "question": "..." }`
- **Output**: `{ "success": boolean, "answer": "...", "sessionId": "..." }`

### Response Format
- If information is found in documents: Answer based on retrieved context
- If information is not found: Returns "Tôi không rõ thông tin này, vui lòng liên hệ với nhà phát triển qua email 22021207@vnu.edu.vn."

## Key Features

1. **Proper RAG Pipeline**: Document retrieval → Context formatting → LLM generation
2. **LangChain Integration**: Uses official LangChain components for reliability
3. **PostgreSQL Compatibility**: Works with existing database schema
4. **Error Handling**: Graceful fallbacks when LLM is unavailable
5. **Context Management**: Proper document similarity scoring and formatting
6. **Session Tracking**: Maintains conversation history with session IDs

## Configuration

The system uses the following environment variables:
- `GEMINI_API_KEY`: Google Gemini API key
- `DB_*`: PostgreSQL connection parameters (inherited from existing config)

## Migration Notes

- The old custom RAG implementation has been replaced
- Database schema remains unchanged (compatible with existing `chatbot_documents` table)
- API contract remains the same for frontend compatibility
- The system maintains conversation history in the same database table