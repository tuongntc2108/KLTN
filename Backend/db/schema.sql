-- =========================
-- Tables for MySBT backend
-- =========================

-- 1) Issuers table
CREATE TABLE IF NOT EXISTS issuers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    organization VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2) Courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    issuer_id INTEGER NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    course_description TEXT,
    training_content TEXT, -- Supports markdown/HTML content
    duration VARCHAR(100), -- e.g., "40 hours", "3 months", etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_courses_issuer 
        FOREIGN KEY (issuer_id) 
        REFERENCES issuers(id) 
        ON DELETE CASCADE,
        
    -- Unique constraint: same issuer cannot have duplicate course names
    CONSTRAINT unique_issuer_course_name 
        UNIQUE (issuer_id, course_name)
);

-- 3) Students table
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4) Certificates table (mirror từ on-chain)
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    token_id BIGINT NOT NULL UNIQUE,
    metadata_uri TEXT NOT NULL,
    holder VARCHAR(42) NOT NULL,
    issuer VARCHAR(42) NOT NULL,
    issued_date TIMESTAMP NOT NULL,
    expire_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,               -- Issued | Active | Expired | Revoked | Replaced
    course_name VARCHAR(100),                  -- For backward compatibility
    course_id INTEGER,                         -- Foreign key to courses table
    student_id VARCHAR(100),
    verification_code VARCHAR(100) UNIQUE NOT NULL,
    certificate_name VARCHAR(50),
    recipient_name TEXT,
    ai_summary TEXT,                           -- AI-generated summary
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_certificates_course 
        FOREIGN KEY (course_id) 
        REFERENCES courses(id) 
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cert_holder  ON certificates(holder);
CREATE INDEX IF NOT EXISTS idx_cert_issuer  ON certificates(issuer);
CREATE INDEX IF NOT EXISTS idx_cert_status  ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_cert_vcode   ON certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_ai_summary ON certificates(ai_summary);

-- 2) Log các event từ blockchain (audit)
CREATE TABLE IF NOT EXISTS certificate_events (
    id SERIAL PRIMARY KEY,
    token_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,           -- Issued | Claimed | Revoked | Expired | Replaced
    issuer VARCHAR(42),
    holder VARCHAR(42),
    reason TEXT,
    related_token BIGINT,                      -- token mới nếu Replaced
    block_number BIGINT NOT NULL,
    tx_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint: mỗi token chỉ có 1 event của mỗi loại
    CONSTRAINT unique_token_event UNIQUE (token_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_ce_token ON certificate_events(token_id);
CREATE INDEX IF NOT EXISTS idx_ce_type  ON certificate_events(event_type);

-- 3) Con trỏ đồng bộ block (để resume an toàn)
CREATE TABLE IF NOT EXISTS sync_cursors (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(50) UNIQUE NOT NULL,
    last_block BIGINT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_issuers_email ON issuers(email);
CREATE INDEX IF NOT EXISTS idx_issuers_wallet ON issuers(wallet_address);

CREATE INDEX IF NOT EXISTS idx_courses_issuer_id ON courses(issuer_id);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(course_name);

CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_wallet ON students(wallet_address);

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