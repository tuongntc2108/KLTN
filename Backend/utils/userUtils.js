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
    
    // Create student with the user_id
    const insertStudentQuery = `
      INSERT INTO students (user_id, id, name, email, wallet_address, created_at) 
      VALUES ($1, $2, $3, $4, $5, NOW()) 
      RETURNING *
    `;
    const insertResult = await pool.query(insertStudentQuery, [
      user.user_id,
      studentData.id,
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
  updateUserRole
};