-- Migration script for Chatbot RAG System
-- Run this to add chatbot tables to existing database

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for storing knowledge documents and their embeddings
CREATE TABLE IF NOT EXISTS chatbot_documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_chunk TEXT, -- For chunked content processing
    chunk_index INTEGER DEFAULT 0, -- Index of chunk within document
    embedding VECTOR(768), -- Gemini text-embedding-004 produces 768-dimensional vectors
    source_file TEXT, -- Original filename
    source_type VARCHAR(50), -- pdf, docx, md, txt
    source_url TEXT, -- Optional URL source
    metadata JSONB, -- Additional metadata (page number, section, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for vector similarity search using IVFFlat algorithm
CREATE INDEX IF NOT EXISTS chatbot_documents_embedding_idx
ON chatbot_documents USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Indexes for filtering and performance
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_title ON chatbot_documents(title);
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_source_type ON chatbot_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_created_at ON chatbot_documents(created_at);

-- Table for managing uploaded files
CREATE TABLE IF NOT EXISTS chatbot_uploads (
    id SERIAL PRIMARY KEY,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL, -- UUID-based filename
    file_path TEXT NOT NULL, -- Full path to stored file
    file_size BIGINT, -- File size in bytes
    mime_type VARCHAR(100),
    file_extension VARCHAR(10),
    upload_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    processing_error TEXT, -- Error message if processing failed
    document_count INTEGER DEFAULT 0, -- Number of document chunks created
    uploaded_by VARCHAR(255), -- User email who uploaded
    uploaded_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Index for upload management
CREATE INDEX IF NOT EXISTS idx_chatbot_uploads_status ON chatbot_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_chatbot_uploads_uploaded_by ON chatbot_uploads(uploaded_by);

-- Table for storing chat conversations
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL, -- Session identifier
    user_email VARCHAR(255), -- Authenticated user email (optional for anonymous)
    user_role VARCHAR(20), -- student, issuer, admin, anonymous
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    context_documents JSONB, -- Array of document IDs used for context
    response_time_ms INTEGER, -- Time taken to generate response
    feedback_rating INTEGER, -- 1-5 rating (optional)
    feedback_comment TEXT, -- User feedback (optional)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for conversation management
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_id ON chatbot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_email ON chatbot_conversations(user_email);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created_at ON chatbot_conversations(created_at);

-- Table for managing chatbot configuration
CREATE TABLE IF NOT EXISTS chatbot_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default chatbot configuration
INSERT INTO chatbot_config (config_key, config_value, description) VALUES 
('system_prompt', '{"prompt": "Bạn là trợ lý AI hỗ trợ người dùng sử dụng hệ thống quản lý chứng chỉ blockchain. Hãy trả lời câu hỏi một cách hữu ích và chính xác dựa trên thông tin được cung cấp. Nếu không có thông tin liên quan, hãy thông báo rằng bạn cần thêm thông tin để trả lời chính xác."}', 'Main system prompt for chatbot'),
('search_limit', '{"limit": 5}', 'Maximum number of documents to retrieve for context'),
('similarity_threshold', '{"threshold": 0.7}', 'Minimum similarity score for document relevance'),
('response_max_tokens', '{"max_tokens": 1000}', 'Maximum tokens in bot response')
ON CONFLICT (config_key) DO NOTHING;

-- Table for chatbot analytics
CREATE TABLE IF NOT EXISTS chatbot_analytics (
    id SERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    total_conversations INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    avg_response_time_ms FLOAT DEFAULT 0,
    avg_feedback_rating FLOAT DEFAULT 0,
    top_topics JSONB, -- Array of most asked topics
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_chatbot_analytics_date ON chatbot_analytics(date);

-- Add comment for documentation
COMMENT ON TABLE chatbot_documents IS 'Stores knowledge base documents with vector embeddings for RAG system';
COMMENT ON TABLE chatbot_uploads IS 'Manages file uploads for knowledge base';
COMMENT ON TABLE chatbot_conversations IS 'Stores chat conversation history';
COMMENT ON TABLE chatbot_config IS 'Configuration settings for chatbot behavior';
COMMENT ON TABLE chatbot_analytics IS 'Analytics and metrics for chatbot usage';