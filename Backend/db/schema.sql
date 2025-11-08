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
    created_at TIMESTAMP DEFAULT NOW()
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