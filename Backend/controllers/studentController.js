const db = require("../config/pg");

// Get student by ID (for issuers when issuing certificates)
exports.getStudentById = async (req, res) => {
  try {
    const studentId = req.params.id;
    console.log("🔍 Debug getStudentById - Student ID requested:", studentId);
    
    if (!studentId) {
      return res.status(400).json({ error: "Bad Request", details: "Student ID is required" });
    }
    
    const idNum = Number(studentId);
    console.log("🔍 Debug getStudentById - Parsed student ID:", idNum);
    
    if (!Number.isInteger(idNum) || idNum <= 0) {
      console.log("❌ Debug getStudentById - Invalid student ID format");
      return res.status(400).json({ error: "Bad Request", details: "Student ID must be a positive integer" });
    }

    const query = `
      SELECT 
        id,
        name,
        email,
        wallet_address,
        created_at
      FROM students 
      WHERE id = $1
    `;
    
    console.log("🔍 Debug getStudentById - Executing query for ID:", idNum);
    const result = await db.pool.query(query, [idNum]);
    console.log("🔍 Debug getStudentById - Query result count:", result.rows.length);
    
    if (result.rows.length === 0) {
      console.log("❌ Debug getStudentById - No student found with ID:", idNum);
      return res.status(404).json({ error: "Not Found", details: "Student not found" });
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

    // Insert
    const q = `
      INSERT INTO students(id, name, email, wallet_address)
      VALUES($1,$2,$3,$4)
      RETURNING id, name, email, wallet_address, created_at
    `;
    const finalWalletAddress = wallet_address && wallet_address.trim() ? wallet_address.trim() : null;
    const params = [idNum, name, email.toLowerCase(), finalWalletAddress];
    const r = await db.pool.query(q, params);
    const s = r.rows[0];

    return res.status(201).json({
      student_id: s.id,
      name: s.name,
      email: s.email,
      wallet_address: s.wallet_address,
      created_at: s.created_at,
    });
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(400).json({ error: "Validation error", details: "email or wallet_address already exists" });
    }
    console.error("❌ createStudent error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getStudents = async (req, res) => {
  try {
    // Get all students with their certificate statistics
    const q = `
      SELECT 
        s.id, 
        s.name, 
        s.email, 
        s.wallet_address, 
        s.created_at,
        COUNT(c.id) as total_certificates,
        COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_certificates,
        COUNT(CASE WHEN c.status = 'expired' OR c.expire_date < NOW() THEN 1 END) as expired_certificates,
        COUNT(CASE WHEN c.status = 'issued_not_claimed' THEN 1 END) as pending_certificates,
        COUNT(CASE WHEN c.status = 'revoked' THEN 1 END) as revoked_certificates,
        ARRAY_AGG(DISTINCT c.course_name) FILTER (WHERE c.course_name IS NOT NULL) as courses
      FROM students s
      LEFT JOIN certificates c ON s.wallet_address = c.holder
      GROUP BY s.id, s.name, s.email, s.wallet_address, s.created_at
      ORDER BY s.id ASC
    `;
    
    const r = await db.pool.query(q);
    
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
      status: row.wallet_address ? 'active' : 'pending'
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
    if (!Number.isInteger(idParam) || idParam <= 0) {
      return res.status(400).json({ error: "Bad Request", details: "Invalid id in URL" });
    }

    const { name, email, wallet_address } = req.body || {};
    if (!name || !email || !wallet_address) {
      return res.status(400).json({ error: "Bad Request", details: "name, email, wallet_address are required" });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({ error: "Bad Request", details: "wallet_address is invalid" });
    }

    const q = `
      UPDATE students
      SET name=$1, email=$2, wallet_address=$3
      WHERE id=$4
      RETURNING id
    `;
    const params = [name, String(email).toLowerCase(), wallet_address, idParam];
    const r = await db.query(q, params);
    if (r.rowCount === 0) {
      return res.status(404).json({ error: "Not Found" });
    }

    return res.status(200).json({ message: "Student updated successfully" });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: "Bad Request", details: "email or wallet_address already exists" });
    }
    console.error("❌ updateStudent error:", err.message);
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
    
    if (!wallet_address) {
      return res.status(400).json({ error: "Bad Request", details: "wallet_address is required" });
    }
    
    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({ error: "Bad Request", details: "Invalid Ethereum wallet address format" });
    }

    // Check if student exists with this email
    const checkStudentQuery = `SELECT id, wallet_address FROM students WHERE email = $1`;
    const studentResult = await db.pool.query(checkStudentQuery, [userEmail.toLowerCase()]);
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Not Found", details: "Student record not found" });
    }

    const student = studentResult.rows[0];
    
    // Check if wallet address is already taken by another student
    const checkWalletQuery = `SELECT id FROM students WHERE wallet_address = $1 AND id != $2`;
    const walletResult = await db.pool.query(checkWalletQuery, [wallet_address, student.id]);
    
    if (walletResult.rows.length > 0) {
      return res.status(400).json({ error: "Bad Request", details: "Wallet address is already connected to another account" });
    }

    // Update wallet address
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
    
    return res.status(200).json({
      success: true,
      message: "Wallet address updated successfully",
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

    let query = `SELECT id, name, email, wallet_address, created_at FROM students WHERE email = $1`;
    let result = await db.pool.query(query, [userEmail.toLowerCase()]);
    
    // If student doesn't exist, create one automatically
    if (result.rows.length === 0) {
      try {
        // Generate a unique ID (timestamp-based for now)
        const studentId = Date.now();
        const insertQuery = `
          INSERT INTO students(id, name, email, wallet_address) 
          VALUES($1, $2, $3, $4) 
          RETURNING id, name, email, wallet_address, created_at
        `;
        const insertResult = await db.pool.query(insertQuery, [
          studentId, 
          userName || 'Unknown User', 
          userEmail.toLowerCase(), 
          null
        ]);
        
        const newStudent = insertResult.rows[0];
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
