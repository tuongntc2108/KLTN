// utils/userUtils.js
const { pool } = require('../config/pg');

/**
 * Creates a user record if one doesn't exist
 * @param {string} email - User's email
 * @returns {Object|null} - User object or null if failed
 */
async function createUserIfNotExists(email) {
  try {
    // Check if user already exists
    const existingUserQuery = 'SELECT user_id, email, last_login, created_at, role FROM users WHERE email = $1';
    const existingResult = await pool.query(existingUserQuery, [email]);
    
    if (existingResult.rows.length > 0) {
      // User already exists, return existing user
      return existingResult.rows[0];
    }
    
    // Create new user with 'undefined' role
    const insertUserQuery = `
      INSERT INTO users (email, role, created_at) 
      VALUES ($1, 'undefined', NOW()) 
      RETURNING user_id, email, last_login, created_at, role
    `;
    const insertResult = await pool.query(insertUserQuery, [email]);
    
    return insertResult.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Updates user's last login timestamp
 * @param {string} email - User's email
 */
async function updateUserLastLogin(email) {
  try {
    const updateQuery = 'UPDATE users SET last_login = NOW() WHERE email = $1';
    await pool.query(updateQuery, [email]);
  } catch (error) {
    console.error('Error updating last login:', error);
    throw error;
  }
}

/**
 * Creates an issuer and links to user if user doesn't exist
 * @param {Object} issuerData - Issuer data including email
 * @returns {Object|null} - Created issuer object or null if failed
 */
async function createIssuerWithUser(issuerData) {
  try {
    // First create or get user
    const user = await createUserIfNotExists(issuerData.email);
    
    // Create issuer with the user_id
    const insertIssuerQuery = `
      INSERT INTO issuers (user_id, name, email, wallet_address, organization, website, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
      RETURNING *
    `;
    const insertResult = await pool.query(insertIssuerQuery, [
      user.user_id,
      issuerData.name,
      issuerData.email,
      issuerData.wallet_address,
      issuerData.organization,
      issuerData.website || null
    ]);
    
    // Update user role to 'Issuer'
    await updateUserRole(user.user_id, 'Issuer');
    
    return insertResult.rows[0];
  } catch (error) {
    console.error('Error creating issuer with user:', error);
    throw error;
  }
}

/**
 * Creates a student and links to user if user doesn't exist
 * @param {Object} studentData - Student data including email
 * @returns {Object|null} - Created student object or null if failed
 */
async function createStudentWithUser(studentData) {
  try {
    // First create or get user
    const user = await createUserIfNotExists(studentData.email);
    
    // Get the authenticated user's issuer_id from the request context
    // For now, we'll need to pass issuerId as part of studentData
    const issuerId = studentData.issuer_id || null; // Default to issuer ID null if not provided
    
    // Create student with the user_id and issuer_id
    const insertStudentQuery = `
      INSERT INTO students (user_id, id, issuer_id, name, email, wallet_address, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
      RETURNING *
    `;
    const insertResult = await pool.query(insertStudentQuery, [
      user.user_id,
      studentData.id,
      issuerId,
      studentData.name,
      studentData.email,
      studentData.wallet_address || null
    ]);
    
    // Update user role to 'Student'
    await updateUserRole(user.user_id, 'Student');
    
    return insertResult.rows[0];
  } catch (error) {
    console.error('Error creating student with user:', error);
    throw error;
  }
}

/**
 * Checks if a user is an admin
 * @param {string} email - User's email
 * @returns {boolean} - True if user is admin, false otherwise
 */
async function isUserAdmin(email) {
  try {
    const query = 'SELECT role FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows.length > 0 && result.rows[0].role === 'Admin';
  } catch (error) {
    console.error('Error checking if user is admin:', error);
    return false;
  }
}

/**
 * Checks if a user is an issuer
 * @param {string} email - User's email
 * @returns {boolean} - True if user is issuer, false otherwise
 */
async function isUserIssuer(email) {
  try {
    const query = 'SELECT role FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows.length > 0 && result.rows[0].role === 'Issuer';
  } catch (error) {
    console.error('Error checking if user is issuer:', error);
    return false;
  }
}

/**
 * Checks if a user is a student
 * @param {string} email - User's email
 * @returns {boolean} - True if user is student, false otherwise
 */
async function isUserStudent(email) {
  try {
    const query = 'SELECT role FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows.length > 0 && result.rows[0].role === 'Student';
  } catch (error) {
    console.error('Error checking if user is student:', error);
    return false;
  }
}

/**
 * Gets user role based on the role column in users table
 * @param {string} email - User's email
 * @returns {string} - Role: 'Admin', 'Issuer', 'Student', or 'undefined'
 */
async function getUserRole(email) {
  try {
    const query = 'SELECT role FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    console.log(`[GET_USER_ROLE] Email: ${email}, Query result rows: ${result.rows.length}`);
    if (result.rows.length > 0) {
      console.log(`[GET_USER_ROLE] Returning role: ${result.rows[0].role}`);
      return result.rows[0].role;
    } else {
      // If user doesn't exist in users table, return 'undefined'
      console.log(`[GET_USER_ROLE] User not found, returning 'undefined'`);
      return 'undefined';
    }
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'undefined';
  }
}

// Update user role in the database
async function updateUserRole(userId, role) {
  try {
    const updateQuery = 'UPDATE users SET role = $1 WHERE user_id = $2';
    await pool.query(updateQuery, [role, userId]);
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Creates an admin and links to user
 * @param {string} email - Admin's email
 * @returns {Object|null} - Created admin object or null if failed
 */
async function createAdminWithUser(email) {
  try {
    // First create or get user
    const user = await createUserIfNotExists(email);
    
    // Create admin with the user_id
    const insertAdminQuery = `
      INSERT INTO admins (user_id, created_at) 
      VALUES ($1, NOW()) 
      RETURNING *
    `;
    const insertResult = await pool.query(insertAdminQuery, [user.user_id]);
    
    // Update user role to 'Admin'
    await updateUserRole(user.user_id, 'Admin');
    
    return insertResult.rows[0];
  } catch (error) {
    console.error('Error creating admin with user:', error);
    throw error;
  }
}

/**
 * Gets full profile of a user including role-specific information
 * Priority: users.full_name (already populated) → fallback to students.name/issuers.name
 * @param {string} email - User's email
 * @returns {Object} - Full profile with role-specific fields
 */
async function getUserFullProfile(email) {
  try {
    // Get base user info
    const userQuery = `
      SELECT user_id, email, role, full_name, avatar_url, language, last_login, created_at
      FROM users
      WHERE email = $1
    `;
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = userResult.rows[0];
    const profile = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      full_name: user.full_name, // From users table (already populated)
      avatar_url: user.avatar_url ? `${user.avatar_url}?t=${Date.now()}` : null, // Add cache busting
      language: user.language || 'vi',
      last_login: user.last_login,
      created_at: user.created_at
    };
    
    // Get role-specific information
    if (user.role === 'Student') {
      const studentQuery = `
        SELECT id as student_id, name, wallet_address
        FROM students
        WHERE email = $1
      `;
      const studentResult = await pool.query(studentQuery, [email]);
      
      if (studentResult.rows.length > 0) {
        const student = studentResult.rows[0];
        profile.student_id = student.student_id;
        profile.wallet_address = student.wallet_address;
        
        // Priority: users.full_name → fallback to students.name
        if (!profile.full_name && student.name) {
          profile.full_name = student.name;
        }
      }
    } else if (user.role === 'Issuer') {
      const issuerQuery = `
        SELECT id as issuer_id, name, wallet_address, organization, website
        FROM issuers
        WHERE email = $1
      `;
      const issuerResult = await pool.query(issuerQuery, [email]);
      
      if (issuerResult.rows.length > 0) {
        const issuer = issuerResult.rows[0];
        profile.issuer_id = issuer.issuer_id;
        profile.wallet_address = issuer.wallet_address;
        profile.organization = issuer.organization;
        profile.website = issuer.website;
        
        // Priority: users.full_name → fallback to issuers.name
        if (!profile.full_name && issuer.name) {
          profile.full_name = issuer.name;
        }
      }
    } else if (user.role === 'Admin') {
      // Admin doesn't have additional fields, just basic profile
      // full_name should already be in users table
    }
    
    return profile;
  } catch (error) {
    console.error('Error getting user full profile:', error);
    throw error;
  }
}

module.exports = {
  createUserIfNotExists,
  updateUserLastLogin,
  createIssuerWithUser,
  createStudentWithUser,
  createAdminWithUser,
  isUserAdmin,
  isUserIssuer,
  isUserStudent,
  getUserRole,
  updateUserRole,
  getUserFullProfile
};