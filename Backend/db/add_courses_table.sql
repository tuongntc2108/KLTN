-- Add courses table for course management
-- Run this SQL to add the courses table

-- First, create issuers table if it doesn't exist (referenced by courses)
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

-- Create courses table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_issuer_id ON courses(issuer_id);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(course_name);

-- Add foreign key constraint to existing certificates table
-- This links certificates to courses instead of storing course_name directly
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS course_id INTEGER,
ADD CONSTRAINT fk_certificates_course 
    FOREIGN KEY (course_id) 
    REFERENCES courses(id) 
    ON DELETE SET NULL;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);

-- Note: We keep course_name column in certificates for backward compatibility
-- New certificates will use course_id, but old ones still have course_name