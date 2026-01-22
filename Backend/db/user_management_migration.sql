-- Migration script to add user management system to existing database
-- Run this script directly in PostgreSQL to add new tables and relationships

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create admins table
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

-- 3. Add user_id column to issuers table
ALTER TABLE issuers ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Add foreign key constraint for issuers
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_issuers_user') THEN
        ALTER TABLE issuers 
        ADD CONSTRAINT fk_issuers_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Add user_id column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Add foreign key constraint for students
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_students_user') THEN
        ALTER TABLE students 
        ADD CONSTRAINT fk_students_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_issuers_user_id ON issuers(user_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- 6. Insert initial admin user if not exists
INSERT INTO users (email, created_at)
SELECT '22021207@vnu.edu.vn', NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '22021207@vnu.edu.vn');

-- 7. Insert admin record linked to user
WITH user_insert AS (
    SELECT user_id FROM users WHERE email = '22021207@vnu.edu.vn'
)
INSERT INTO admins (user_id, created_at)
SELECT user_id, NOW()
FROM user_insert
WHERE NOT EXISTS (SELECT 1 FROM admins a JOIN users u ON a.user_id = u.user_id WHERE u.email = '22021207@vnu.edu.vn');

-- 8. Link existing issuers to users (create user records for existing issuers if they don't exist)
INSERT INTO users (email, created_at)
SELECT DISTINCT i.email, NOW()
FROM issuers i
LEFT JOIN users u ON i.email = u.email
WHERE u.email IS NULL;

-- 9. Update issuers table to link to user_id
UPDATE issuers 
SET user_id = (SELECT user_id FROM users WHERE users.email = issuers.email)
WHERE user_id IS NULL;

-- 10. Link existing students to users (create user records for existing students if they don't exist)
INSERT INTO users (email, created_at)
SELECT DISTINCT s.email, NOW()
FROM students s
LEFT JOIN users u ON s.email = u.email
WHERE u.email IS NULL;

-- 11. Update students table to link to user_id
UPDATE students 
SET user_id = (SELECT user_id FROM users WHERE users.email = students.email)
WHERE user_id IS NULL;

-- Migration complete
SELECT 'User management system migration completed successfully!' as message;