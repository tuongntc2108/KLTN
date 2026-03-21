-- ================================================
-- Database Schema for MySBT Blockchain Certificate System
-- ================================================

-- Extension for vector similarity search
-- Used for RAG (Retrieval Augmented Generation) system
CREATE EXTENSION IF NOT EXISTS vector;


-- ==================================================
-- User Management Tables
-- ==================================================

-- Users table: Central user identity with login tracking
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'undefined',
    full_name VARCHAR(255),
    avatar_url TEXT,
    language VARCHAR(10) DEFAULT 'vi',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admins table: Links users to admin role
CREATE TABLE IF NOT EXISTS admins (
    admin_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_admins_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE,
        
    -- Ensure user_id is unique
    CONSTRAINT unique_admin_user_id UNIQUE (user_id)
);


-- ==================================================
-- Core Certificate Management Tables
-- ==================================================

-- Issuers table: Organizations that can issue certificates
CREATE TABLE IF NOT EXISTS issuers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    organization VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_issuers_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE SET NULL
);

-- Courses table: Training programs offered by issuers
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

-- Students table: Learners who can receive certificates
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    issuer_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_students_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE SET NULL,
    CONSTRAINT fk_students_issuer
        FOREIGN KEY (issuer_id)
        REFERENCES issuers(id)
        ON DELETE CASCADE
);

-- Certificates table: On-chain certificates mirrored in database
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
    student_id INTEGER,
    verification_code VARCHAR(100) UNIQUE NOT NULL,
    certificate_name VARCHAR(50),
    recipient_name TEXT,
    data_hash VARCHAR(66),                      -- 0x + 64 hex chars from on-chain bytes32
    ai_summary TEXT,                           -- AI-generated summary
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_certificates_course 
        FOREIGN KEY (course_id) 
        REFERENCES courses(id) 
        ON DELETE SET NULL
);


-- ==================================================
-- Blockchain Event Tracking Tables
-- ==================================================

-- Certificate events table: Audit log of blockchain events
CREATE TABLE IF NOT EXISTS certificate_events (
    id SERIAL PRIMARY KEY,
    token_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,           -- Issued | Claimed | Revoked | Expired | Replaced
    reason TEXT,
    related_token BIGINT,                      -- New token if Replaced
    block_number BIGINT NOT NULL,
    tx_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint: each token can have only one event of each type
    CONSTRAINT unique_token_event UNIQUE (token_id, event_type)
);

-- Sync cursors table: Block pointers for safe resume of synchronization
CREATE TABLE IF NOT EXISTS sync_cursors (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(50) UNIQUE NOT NULL,
    last_block BIGINT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ==================================================
-- RAG (Retrieval Augmented Generation) Tables
-- ==================================================

-- Chatbot documents table: Knowledge base with vector embeddings
CREATE TABLE IF NOT EXISTS chatbot_documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_chunk TEXT, -- For chunked content processing
    chunk_index INTEGER DEFAULT 0, -- Index of chunk within document
    embedding VECTOR(1536), -- Updated to 1536 dimensions for better embeddings
    source_file TEXT, -- Original filename
    source_type VARCHAR(50), -- pdf, docx, md, txt
    source_url TEXT, -- Optional URL source
    metadata JSONB, -- Additional metadata (page number, section, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chatbot uploads table: Manages file uploads for knowledge base
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

-- Chatbot conversations table: Stores chat conversation history
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

-- Chatbot configuration table: Configuration settings for chatbot behavior
CREATE TABLE IF NOT EXISTS chatbot_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chatbot analytics table: Analytics and metrics for chatbot usage
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


-- ==================================================
-- Indexes for Performance Optimization
-- ==================================================

-- User management indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Certificate indexes
CREATE INDEX IF NOT EXISTS idx_cert_holder  ON certificates(holder);
CREATE INDEX IF NOT EXISTS idx_cert_issuer  ON certificates(issuer);
CREATE INDEX IF NOT EXISTS idx_cert_status  ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_cert_vcode   ON certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_ai_summary ON certificates(ai_summary);
CREATE INDEX IF NOT EXISTS idx_certificates_data_hash ON certificates(data_hash);

-- Certificate events indexes
CREATE INDEX IF NOT EXISTS idx_ce_token ON certificate_events(token_id);
CREATE INDEX IF NOT EXISTS idx_ce_type  ON certificate_events(event_type);

-- Issuer indexes
CREATE INDEX IF NOT EXISTS idx_issuers_email ON issuers(email);
CREATE INDEX IF NOT EXISTS idx_issuers_wallet ON issuers(wallet_address);
CREATE INDEX IF NOT EXISTS idx_issuers_user_id ON issuers(user_id);

-- Course indexes
CREATE INDEX IF NOT EXISTS idx_courses_issuer_id ON courses(issuer_id);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(course_name);

-- Student indexes
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_wallet ON students(wallet_address);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- Chatbot documents indexes
CREATE INDEX IF NOT EXISTS chatbot_documents_embedding_idx
ON chatbot_documents USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_chatbot_documents_title ON chatbot_documents(title);
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_source_type ON chatbot_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_created_at ON chatbot_documents(created_at);

-- Chatbot uploads indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_uploads_status ON chatbot_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_chatbot_uploads_uploaded_by ON chatbot_uploads(uploaded_by);

-- Chatbot conversations indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_id ON chatbot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_email ON chatbot_conversations(user_email);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created_at ON chatbot_conversations(created_at);

-- Chatbot analytics indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_analytics_date ON chatbot_analytics(date);


-- ==================================================
-- Default Configuration Data
-- ==================================================

-- Insert initial admin user if not exists
INSERT INTO users (email, created_at)
SELECT '22021207@vnu.edu.vn', NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '22021207@vnu.edu.vn');

-- Insert admin record linked to user
WITH user_insert AS (
    SELECT user_id FROM users WHERE email = '22021207@vnu.edu.vn'
)
INSERT INTO admins (user_id, created_at)
SELECT user_id, NOW()
FROM user_insert
WHERE NOT EXISTS (SELECT 1 FROM admins a JOIN users u ON a.user_id = u.user_id WHERE u.email = '22021207@vnu.edu.vn');

-- Insert default chatbot configuration
INSERT INTO chatbot_config (config_key, config_value, description) VALUES 
('system_prompt', '{"prompt": "Bạn là trợ lý AI hỗ trợ người dùng sử dụng hệ thống quản lý chứng chỉ blockchain. Hãy trả lời câu hỏi một cách hữu ích và chính xác dựa trên thông tin được cung cấp. Nếu không có thông tin liên quan, hãy thông báo rằng bạn cần thêm thông tin để trả lời chính xác."}', 'Main system prompt for chatbot'),
('search_limit', '{"limit": 5}', 'Maximum number of documents to retrieve for context'),
('similarity_threshold', '{"threshold": 0.7}', 'Minimum similarity score for document relevance'),
('response_max_tokens', '{"max_tokens": 1000}', 'Maximum tokens in bot response')
ON CONFLICT (config_key) DO NOTHING;


-- ==================================================
-- Table Documentation Comments
-- ==================================================

-- Add comments for documentation
COMMENT ON TABLE chatbot_documents IS 'Stores knowledge base documents with vector embeddings for RAG system';
COMMENT ON TABLE chatbot_uploads IS 'Manages file uploads for knowledge base';
COMMENT ON TABLE chatbot_conversations IS 'Stores chat conversation history';
COMMENT ON TABLE chatbot_config IS 'Configuration settings for chatbot behavior';
COMMENT ON TABLE chatbot_analytics IS 'Analytics and metrics for chatbot usage';
