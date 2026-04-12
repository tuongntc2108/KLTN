// controllers/courseController.js
const db = require("../config/pg");
const { createIssuerWithUser } = require('../utils/userUtils');

// Helper function to get issuer_id from user email
async function getIssuerIdFromEmail(email) {
  try {
    // First check if issuers table exists
    // const tableCheck = await db.pool.query(`
    //   SELECT EXISTS (
    //     SELECT FROM information_schema.tables 
    //     WHERE table_schema = 'public' 
    //     AND table_name = 'issuers'
    //   )
    // `);
    
    // Now check if issuer exists
    const query = `SELECT id FROM issuers WHERE email = $1`;
    const result = await db.pool.query(query, [email.toLowerCase()]);
    
    if (result.rows.length === 0) {
      // If issuer doesn't exist, throw an error instead of creating one
      throw new Error(
        `Issuer with email ${email} does not exist. Please contact an administrator to create an issuer account.`
      );
    }
    
    return result.rows[0].id;
  } catch (error) {
    console.error('❌ Error getting issuer ID:', error.message);
    throw error;
  }
}

// CREATE - Add new course
exports.createCourse = async (req, res) => {
  try {
    const { course_name, course_description, training_content, duration } = req.body;
    const userEmail = req.user?.email;

    // Validation
    if (!course_name || !userEmail) {
      return res.status(400).json({ 
        success: false,
        error: "Course name and authenticated user are required" 
      });
    }

    if (course_name.length > 255) {
      return res.status(400).json({ 
        success: false,
        error: "Course name too long (max 255 characters)" 
      });
    }

    // Get issuer ID
    const issuerId = await getIssuerIdFromEmail(userEmail);

    // Insert course
    const insertQuery = `
      INSERT INTO courses (issuer_id, course_name, course_description, training_content, duration)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, issuer_id, course_name, course_description, training_content, duration, created_at, updated_at
    `;
    
    const values = [
      issuerId,
      course_name.trim(),
      course_description?.trim() || null,
      training_content?.trim() || null,
      duration?.trim() || null
    ];

    const result = await db.pool.query(insertQuery, values);
    const course = result.rows[0];

    console.log(`✅ Course created: ${course.course_name} by issuer ${issuerId}`);

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course: course
    });

  } catch (error) {
    console.error("❌ Create course error:", error.message);
    
    if (error.code === '23505') { // check lỗi unique_violation (vi phạm ràng buộc duy nhất)
      return res.status(400).json({ 
        success: false,
        error: "Course name already exists for this issuer" 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
};

// READ - Get all courses for current issuer
exports.getCourses = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    
    if (!userEmail) {
      return res.status(401).json({ 
        success: false,
        error: "Authentication required" 
      });
    }

    // Get issuer ID
    const issuerId = await getIssuerIdFromEmail(userEmail);

    // Query courses with certificate count
    const query = `
      SELECT 
        c.id,
        c.issuer_id,
        c.course_name,
        c.course_description,
        c.training_content,
        c.duration,
        c.created_at,
        c.updated_at,
        COUNT(cert.id) as certificate_count
      FROM courses c
      LEFT JOIN certificates cert ON c.id = cert.course_id
      WHERE c.issuer_id = $1
      GROUP BY c.id, c.issuer_id, c.course_name, c.course_description, c.training_content, c.duration, c.created_at, c.updated_at
      ORDER BY c.created_at DESC
    `;

    const result = await db.pool.query(query, [issuerId]);

    return res.status(200).json({
      success: true,
      courses: result.rows.map(row => ({
        ...row,
        certificate_count: parseInt(row.certificate_count) || 0
      }))
    });

  } catch (error) {
    console.error("❌ Get courses error:", error.message);
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
};

// READ - Get single course by ID
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email;

    if (!userEmail || !id) {
      return res.status(400).json({ 
        success: false,
        error: "Course ID and authentication required" 
      });
    }

    // Get issuer ID
    const issuerId = await getIssuerIdFromEmail(userEmail);

    // Query specific course with certificate count
    //lọc cả id course và issuer để ràng buộc quyền sở hữu, tránh lộ thông tin khóa học của issuer khác
    const query = `
      SELECT 
        c.id,
        c.issuer_id,
        c.course_name,
        c.course_description,
        c.training_content,
        c.duration,
        c.created_at,
        c.updated_at,
        COUNT(cert.id) as certificate_count
      FROM courses c
      LEFT JOIN certificates cert ON c.id = cert.course_id
      WHERE c.id = $1 AND c.issuer_id = $2
      GROUP BY c.id, c.issuer_id, c.course_name, c.course_description, c.training_content, c.duration, c.created_at, c.updated_at
    `;

    const result = await db.pool.query(query, [id, issuerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Course not found" 
      });
    }

    const course = result.rows[0];

    return res.status(200).json({
      success: true,
      course: {
        ...course,
        certificate_count: parseInt(course.certificate_count) || 0
      }
    });

  } catch (error) {
    console.error("❌ Get course by ID error:", error.message);
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
};

// UPDATE - Update course
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { course_name, course_description, training_content, duration } = req.body;
    const userEmail = req.user?.email;

    if (!userEmail || !id) {
      return res.status(400).json({ 
        success: false,
        error: "Course ID and authentication required" 
      });
    }

    // Get issuer ID
    const issuerId = await getIssuerIdFromEmail(userEmail);

    // Prepare update fields
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (course_name !== undefined) {
      if (!course_name.trim()) {
        return res.status(400).json({ 
          success: false,
          error: "Course name cannot be empty" 
        });
      }
      updateFields.push(`course_name = $${paramIndex++}`);
      values.push(course_name.trim());
    }

    if (course_description !== undefined) {
      updateFields.push(`course_description = $${paramIndex++}`);
      values.push(course_description?.trim() || null);
    }

    if (training_content !== undefined) {
      updateFields.push(`training_content = $${paramIndex++}`);
      values.push(training_content?.trim() || null);
    }

    if (duration !== undefined) {
      updateFields.push(`duration = $${paramIndex++}`);
      values.push(duration?.trim() || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "No fields to update" 
      });
    }

    // Add updated_at
    updateFields.push(`updated_at = NOW()`);

    // Add WHERE conditions
    values.push(id, issuerId);

    const updateQuery = `
      UPDATE courses 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex++} AND issuer_id = $${paramIndex++}
      RETURNING id, issuer_id, course_name, course_description, training_content, duration, created_at, updated_at
    `;

    const result = await db.pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Course not found or unauthorized" 
      });
    }

    console.log(`✅ Course updated: ${result.rows[0].course_name}`);

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course: result.rows[0]
    });

  } catch (error) {
    console.error("❌ Update course error:", error.message);
    
    if (error.code === '23505') { // unique_violation
      return res.status(400).json({ 
        success: false,
        error: "Course name already exists for this issuer" 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
};

// DELETE - Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email;

    if (!userEmail || !id) {
      return res.status(400).json({ 
        success: false,
        error: "Course ID and authentication required" 
      });
    }

    // Get issuer ID
    const issuerId = await getIssuerIdFromEmail(userEmail);

    // Check if course has certificates
    const certificateCheckQuery = `
      SELECT COUNT(*) as cert_count FROM certificates WHERE course_id = $1
    `;
    const certResult = await db.pool.query(certificateCheckQuery, [id]);
    const certificateCount = parseInt(certResult.rows[0].cert_count) || 0;

    if (certificateCount > 0) {
      return res.status(400).json({ 
        success: false,
        error: `Cannot delete course. ${certificateCount} certificates are linked to this course.`,
        certificate_count: certificateCount
      });
    }

    // Delete course
    const deleteQuery = `
      DELETE FROM courses 
      WHERE id = $1 AND issuer_id = $2
      RETURNING course_name
    `;

    const result = await db.pool.query(deleteQuery, [id, issuerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Course not found or unauthorized" 
      });
    }

    console.log(`✅ Course deleted: ${result.rows[0].course_name}`);

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully"
    });

  } catch (error) {
    console.error("❌ Delete course error:", error.message);
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
};