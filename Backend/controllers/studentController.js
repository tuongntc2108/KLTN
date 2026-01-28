const db = require("../config/pg");
const { createStudentWithUser } = require('../utils/userUtils');

// Get student by ID (for issuers when issuing certificates)
exports.getStudentById = async (req, res) => {
  try {
    const studentId = req.params.id;
    const userEmail = req.user?.email;
    
    console.log("🔍 Debug getStudentById - Student ID requested:", studentId);
    console.log("🔍 Debug getStudentById - User email:", userEmail);
    
    if (!studentId) {
      return res.status(400).json({ error: "Bad Request", details: "Student ID is required" });
    }
    
    const idNum = Number(studentId);
    console.log("🔍 Debug getStudentById - Parsed student ID:", idNum);
    
    if (!Number.isInteger(idNum) || idNum <= 0) {
      console.log("❌ Debug getStudentById - Invalid student ID format");
      return res.status(400).json({ error: "Bad Request", details: "Student ID must be a positive integer" });
    }

    // Get the authenticated user's issuer information
    const userIssuerQuery = `SELECT i.id as issuer_id FROM users u JOIN issuers i ON u.user_id = i.user_id WHERE u.email = $1`;
    const userIssuerResult = await db.pool.query(userIssuerQuery, [userEmail]);
    
    if (userIssuerResult.rows.length === 0) {
      return res.status(403).json({ error: "Forbidden", details: "User is not an issuer" });
    }
    
    const userIssuerId = userIssuerResult.rows[0].issuer_id;
    console.log("🔍 Debug getStudentById - User issuer ID:", userIssuerId);

    const query = `
      SELECT 
        id,
        name,
        email,
        wallet_address,
        created_at
      FROM students 
      WHERE id = $1 AND issuer_id = $2
    `;
    
    console.log("🔍 Debug getStudentById - Executing query for ID:", idNum, "and issuer ID:", userIssuerId);
    const result = await db.pool.query(query, [idNum, userIssuerId]);
    console.log("🔍 Debug getStudentById - Query result count:", result.rows.length);
    
    if (result.rows.length === 0) {
      console.log("❌ Debug getStudentById - No student found with ID:", idNum, "for issuer:", userIssuerId);
      return res.status(404).json({ error: "Not Found", details: "Student not found or does not belong to your organization" });
    }

    const student = result.rows[0];
    console.log("✅ Debug getStudentById - Found student:", {
      id: student.id,
      name: student.name,
      email: student.email,
      has_wallet: !!student.wallet_address
    });
    
    return res.status(200).json({
      success: true,
      student: {
        student_id: student.id,
        name: student.name,
        email: student.email,
        wallet_address: student.wallet_address,
        created_at: student.created_at,
        has_wallet: !!student.wallet_address
      }
    });
  } catch (err) {
    console.error("❌ getStudentById error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { student_id, id: aliasId, name, email, wallet_address } = req.body;
    const userEmail = req.user?.email;
    
    // Get the authenticated user's issuer information
    const userIssuerQuery = `SELECT i.id as issuer_id FROM users u JOIN issuers i ON u.user_id = i.user_id WHERE u.email = $1`;
    const userIssuerResult = await db.pool.query(userIssuerQuery, [userEmail]);
    
    if (userIssuerResult.rows.length === 0) {
      return res.status(403).json({ error: "Forbidden", details: "User is not an issuer" });
    }
    
    const userIssuerId = userIssuerResult.rows[0].issuer_id;

    // Validation
    const candidateId = student_id ?? aliasId;
    if (!candidateId || !name || !email) {
      return res.status(400).json({ error: "Validation error", details: "student_id (or id), name, email are required" });
    }
    const idNum = Number(candidateId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: "Validation error", details: "student_id must be a positive integer" });
    }
    
    // Validate wallet_address only if provided
    if (wallet_address && wallet_address.trim() && !/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({ error: "Validation error", details: "wallet_address is invalid" });
    }

    // Check if student ID or email already exists in students table
    const checkExistingQuery = `SELECT id, email FROM students WHERE id = $1 OR email = $2`;
    const checkResult = await db.pool.query(checkExistingQuery, [idNum, email.toLowerCase()]);
    
    if (checkResult.rows.length > 0) {
      // Determine which field caused the conflict
      const existingRecord = checkResult.rows[0];
      let conflictField = "";
      
      if (existingRecord.id === idNum) {
        conflictField = "student_id";
      } else if (existingRecord.email.toLowerCase() === email.toLowerCase()) {
        conflictField = "email";
      }
      
      return res.status(400).json({ 
        error: "Validation error", 
        details: `Student ${conflictField} already exists` 
      });
    }

    // Create student with user (using new user management system)
    const studentData = {
      id: idNum,
      name: name,
      email: email.toLowerCase(),
      wallet_address: wallet_address && wallet_address.trim() ? wallet_address.trim() : null,
      issuer_id: userIssuerId
    };
    
    const newStudent = await createStudentWithUser(studentData);

    return res.status(201).json({
      student_id: newStudent.id,
      name: newStudent.name,
      email: newStudent.email,
      wallet_address: newStudent.wallet_address,
      created_at: newStudent.created_at,
    });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(400).json({ error: "Validation error", details: "Email hoặc địa chỉ ví đã tồn tại" });
    }
    console.error("❌ createStudent error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    
    // Get the authenticated user's issuer information
    const userIssuerQuery = `SELECT i.id as issuer_id FROM users u JOIN issuers i ON u.user_id = i.user_id WHERE u.email = $1`;
    const userIssuerResult = await db.pool.query(userIssuerQuery, [userEmail]);
    
    if (userIssuerResult.rows.length === 0) {
      return res.status(403).json({ error: "Forbidden", details: "User is not an issuer" });
    }
    
    const userIssuerId = userIssuerResult.rows[0].issuer_id;
    
    // Get students for the authenticated issuer with their certificate statistics
    const q = `
      SELECT 
        s.id, 
        s.name, 
        s.email, 
        s.wallet_address, 
        s.created_at,
        s.issuer_id,
        COUNT(c.id) as total_certificates,
        COUNT(CASE WHEN c.status = 'Active' THEN 1 END) as active_certificates,
        COUNT(CASE WHEN c.status = 'Expired' OR c.expire_date < NOW() THEN 1 END) as expired_certificates,
        COUNT(CASE WHEN c.status = 'Issued' THEN 1 END) as pending_certificates,
        COUNT(CASE WHEN c.status = 'Revoked' THEN 1 END) as revoked_certificates,
        ARRAY_AGG(DISTINCT c.course_name) FILTER (WHERE c.course_name IS NOT NULL) as courses
      FROM students s
      LEFT JOIN certificates c ON s.wallet_address = c.holder
      WHERE s.issuer_id = $1
      GROUP BY s.id, s.name, s.email, s.wallet_address, s.created_at, s.issuer_id
      ORDER BY s.id ASC
    `;
    
    const r = await db.pool.query(q, [userIssuerId]);
    
    const result = r.rows.map(row => ({
      student_id: row.id,
      name: row.name,
      email: row.email,
      wallet_address: row.wallet_address,
      created_at: row.created_at,
      totalCertificates: parseInt(row.total_certificates) || 0,
      activeCertificates: parseInt(row.active_certificates) || 0,
      expiredCertificates: parseInt(row.expired_certificates) || 0,
      pendingCertificates: parseInt(row.pending_certificates) || 0,
      revokedCertificates: parseInt(row.revoked_certificates) || 0,
      courses: row.courses ? row.courses.filter(course => course !== null) : [],
      status: row.wallet_address ? 'Active' : 'Issued'
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ getStudents error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const idParam = Number(req.params.id);
    const userEmail = req.user?.email;
    
    if (!Number.isInteger(idParam) || idParam <= 0) {
      return res.status(400).json({ error: "Bad Request", details: "Invalid id in URL" });
    }

    const { name, email } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: "Bad Request", details: "name and email are required" });
    }
    
    // Get the authenticated user's issuer information
    const userIssuerQuery = `SELECT i.id as issuer_id FROM users u JOIN issuers i ON u.user_id = i.user_id WHERE u.email = $1`;
    const userIssuerResult = await db.pool.query(userIssuerQuery, [userEmail]);
    
    if (userIssuerResult.rows.length === 0) {
      return res.status(403).json({ error: "Forbidden", details: "User is not an issuer" });
    }
    
    const userIssuerId = userIssuerResult.rows[0].issuer_id;

    const q = `
      UPDATE students
      SET name=$1, email=$2
      WHERE id=$3 AND issuer_id=$4
      RETURNING id
    `;
    const params = [name, String(email).toLowerCase(), idParam, userIssuerId];
    const r = await db.pool.query(q, params);
    if (r.rowCount === 0) {
      return res.status(404).json({ error: "Not Found", details: "Student not found or does not belong to your organization" });
    }

    return res.status(200).json({ message: "Student updated successfully" });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: "Bad Request", details: "Email đã tồn tại" });
    }
    console.error("❌ updateStudent error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete student only if they have no certificates
exports.deleteStudent = async (req, res) => {
  try {
    const idParam = Number(req.params.id);
    const userEmail = req.user?.email;
    
    if (!Number.isInteger(idParam) || idParam <= 0) {
      return res.status(400).json({ error: "Bad Request", details: "Invalid id in URL" });
    }
    
    // Get the authenticated user's issuer information
    const userIssuerQuery = `SELECT i.id as issuer_id FROM users u JOIN issuers i ON u.user_id = i.user_id WHERE u.email = $1`;
    const userIssuerResult = await db.pool.query(userIssuerQuery, [userEmail]);
    
    if (userIssuerResult.rows.length === 0) {
      return res.status(403).json({ error: "Forbidden", details: "User is not an issuer" });
    }
    
    const userIssuerId = userIssuerResult.rows[0].issuer_id;

    // Check if student has any certificates (by both wallet address and student ID)
    const checkCertificatesByHolderQuery = `SELECT COUNT(*) as count FROM certificates WHERE holder = (SELECT wallet_address FROM students WHERE id = $1 AND issuer_id = $2)`;
    const certByHolderResult = await db.pool.query(checkCertificatesByHolderQuery, [idParam, userIssuerId]);
    
    const checkCertificatesByStudentIdQuery = `SELECT COUNT(*) as count FROM certificates WHERE student_id = $1::TEXT`;
    const certByStudentIdResult = await db.pool.query(checkCertificatesByStudentIdQuery, [idParam]);
    
    const totalCertificates = parseInt(certByHolderResult.rows[0].count) + parseInt(certByStudentIdResult.rows[0].count);
    
    if (totalCertificates > 0) {
      return res.status(400).json({ error: "Bad Request", details: "Không thể xóa học viên đang có chứng chỉ" });
    }

    // Check if student exists and belongs to the authenticated issuer
    const checkStudentQuery = `SELECT id FROM students WHERE id = $1 AND issuer_id = $2`;
    const studentResult = await db.pool.query(checkStudentQuery, [idParam, userIssuerId]);
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Not Found", details: "Student not found or does not belong to your organization" });
    }

    // Delete the student
    const deleteQuery = `DELETE FROM students WHERE id = $1 AND issuer_id = $2`;
    const deleteResult = await db.pool.query(deleteQuery, [idParam, userIssuerId]);
    
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: "Not Found", details: "Student not found or does not belong to your organization" });
    }

    return res.status(200).json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("❌ deleteStudent error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// New method to update wallet address for authenticated user
exports.updateWalletAddress = async (req, res) => {
  try {
    const { wallet_address } = req.body;
    const userEmail = req.user?.email; // From authentication middleware
    
    if (!userEmail) {
      return res.status(401).json({ error: "Unauthorized", details: "User not authenticated" });
    }
    
    // Allow null wallet_address to clear the connection
    if (wallet_address !== null && wallet_address !== undefined) {
      // Validate Ethereum address format if provided
      if (wallet_address && !/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
        return res.status(400).json({ error: "Bad Request", details: "Invalid Ethereum wallet address format" });
      }
    }

    // Check if student exists with this email
    const checkStudentQuery = `SELECT id, wallet_address FROM students WHERE email = $1`;
    const studentResult = await db.pool.query(checkStudentQuery, [userEmail.toLowerCase()]);
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Not Found", details: "Student record not found" });
    }

    const student = studentResult.rows[0];
    
    // Check if wallet address is already taken by another student (only if not null)
    if (wallet_address) {
      const checkWalletQuery = `SELECT id FROM students WHERE wallet_address = $1 AND id != $2`;
      const walletResult = await db.pool.query(checkWalletQuery, [wallet_address, student.id]);
      
      if (walletResult.rows.length > 0) {
        return res.status(400).json({ error: "Bad Request", details: "Wallet address is already connected to another account" });
      }
    }

    // Update wallet address (can be null to clear connection)
    const updateQuery = `
      UPDATE students 
      SET wallet_address = $1 
      WHERE email = $2 
      RETURNING id, name, email, wallet_address, created_at
    `;
    const updateResult = await db.pool.query(updateQuery, [wallet_address, userEmail.toLowerCase()]);
    
    if (updateResult.rows.length === 0) {
      return res.status(500).json({ error: "Internal Server Error", details: "Failed to update wallet address" });
    }

    const updatedStudent = updateResult.rows[0];
    
    const message = wallet_address ? "Wallet address updated successfully" : "Wallet address cleared successfully";
    
    return res.status(200).json({
      success: true,
      message: message,
      student: {
        student_id: updatedStudent.id,
        name: updatedStudent.name,
        email: updatedStudent.email,
        wallet_address: updatedStudent.wallet_address,
        created_at: updatedStudent.created_at
      }
    });
  } catch (err) {
    console.error("❌ updateWalletAddress error:", err.message);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};

// Get current user's wallet info
exports.getMyWalletInfo = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const userName = req.user?.fullName;
    
    if (!userEmail) {
      return res.status(401).json({ error: "Unauthorized", details: "User not authenticated" });
    }

    let query = `SELECT id, name, email, wallet_address, created_at, issuer_id FROM students WHERE email = $1`;
    let result = await db.pool.query(query, [userEmail.toLowerCase()]);
    
    // If student doesn't exist, create one automatically
    if (result.rows.length === 0) {
      try {
        // Generate a unique ID (timestamp-based for now)
        const studentId = Date.now();
        
        // Get the authenticated user's issuer information to assign to new student
        // For students signing up directly, we'll assign them to a default issuer (e.g., issuer_id = 1)
        const userIssuerQuery = `SELECT i.id as issuer_id FROM users u JOIN issuers i ON u.user_id = i.user_id WHERE u.email = $1`;
        const userIssuerResult = await db.pool.query(userIssuerQuery, [userEmail]);
        
        let issuerId = 1; // Default issuer ID if the user is not an issuer
        if (userIssuerResult.rows.length > 0) {
          issuerId = userIssuerResult.rows[0].issuer_id;
        }
        
        // Create student with user (using new user management system)
        const studentData = {
          id: studentId,
          name: userName || 'Unknown User',
          email: userEmail.toLowerCase(),
          wallet_address: null,
          issuer_id: issuerId
        };
        
        const newStudent = await createStudentWithUser(studentData);
        
        return res.status(200).json({
          success: true,
          student: {
            student_id: newStudent.id,
            name: newStudent.name,
            email: newStudent.email,
            wallet_address: newStudent.wallet_address,
            created_at: newStudent.created_at,
            has_wallet: !!newStudent.wallet_address
          }
        });
      } catch (insertError) {
        if (insertError.code === '23505') {
          // If there's a unique constraint violation, try to get the existing record
          result = await db.pool.query(query, [userEmail.toLowerCase()]);
          if (result.rows.length > 0) {
            const student = result.rows[0];
            return res.status(200).json({
              success: true,
              student: {
                student_id: student.id,
                name: student.name,
                email: student.email,
                wallet_address: student.wallet_address,
                created_at: student.created_at,
                has_wallet: !!student.wallet_address
              }
            });
          }
        }
        throw insertError;
      }
    }

    const student = result.rows[0];
    
    return res.status(200).json({
      success: true,
      student: {
        student_id: student.id,
        name: student.name,
        email: student.email,
        wallet_address: student.wallet_address,
        created_at: student.created_at,
        has_wallet: !!student.wallet_address
      }
    });
  } catch (err) {
    console.error("❌ getMyWalletInfo error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
