-- Migration script to add role column to users table and update user roles
-- Run this script directly in PostgreSQL to add role column and update existing users

-- 1. Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'undefined';

-- 2. Update roles for existing admin users
UPDATE users 
SET role = 'Admin'
WHERE user_id IN (SELECT user_id FROM admins);

-- 3. Update roles for existing issuer users
UPDATE users 
SET role = 'Issuer'
WHERE user_id IN (SELECT user_id FROM issuers)
AND role != 'Admin';  -- Don't downgrade admins to issuers

-- 4. Update roles for existing student users
UPDATE users 
SET role = 'Student'
WHERE user_id IN (SELECT user_id FROM students)
AND role NOT IN ('Admin', 'Issuer');  -- Don't downgrade admins or issuers to students

-- 5. For users who are not in any specific role table, keep role as 'undefined'
-- (This is already the default, but explicitly setting for clarity)

-- 6. Update the role for users who appear in multiple tables (prioritize Admin > Issuer > Student)
UPDATE users 
SET role = 'Admin'
WHERE user_id IN (
    SELECT u.user_id 
    FROM users u 
    JOIN admins a ON u.user_id = a.user_id
);

UPDATE users 
SET role = 'Issuer'
WHERE user_id IN (
    SELECT u.user_id 
    FROM users u 
    LEFT JOIN admins a ON u.user_id = a.user_id
    JOIN issuers i ON u.user_id = i.user_id
    WHERE a.user_id IS NULL  -- Not an admin
);

UPDATE users 
SET role = 'Student'
WHERE user_id IN (
    SELECT u.user_id 
    FROM users u 
    LEFT JOIN admins a ON u.user_id = a.user_id
    LEFT JOIN issuers i ON u.user_id = i.user_id
    JOIN students s ON u.user_id = s.user_id
    WHERE a.user_id IS NULL AND i.user_id IS NULL  -- Neither admin nor issuer
);

-- Migration complete
SELECT 'User role migration completed successfully!' as message;