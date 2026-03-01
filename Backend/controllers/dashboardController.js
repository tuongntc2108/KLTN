const db = require('../config/pg')
const { getUserRole } = require('../utils/userUtils')

const dashboardController = {
  // Lấy thống kê tổng quan (role-aware: Admin shows system-wide, Issuer shows their own data)
  getStats: async (req, res) => {
    try {
      const client = await db.pool.connect()
      
      try {
        // Get user info for role-aware filtering
        const userEmail = req.user?.email
        const userRole = await getUserRole(userEmail)
        
        let issuerIdParam = null
        let studentsWhereClause = 'WHERE 1=1'
        let certificatesWhereClause = 'WHERE 1=1'
        let coursesWhereClause = 'WHERE 1=1'
        
        // If user is an Issuer, filter data by their issuer_id
        if (userRole === 'Issuer') {
          const issuerQuery = `
            SELECT id FROM issuers WHERE email = $1
          `
          const issuerResult = await client.query(issuerQuery, [userEmail])
          if (issuerResult.rows.length === 0) {
            return res.status(403).json({
              success: false,
              error: 'Issuer not found'
            })
          }
          issuerIdParam = issuerResult.rows[0].id
          
          // Build filtered WHERE clauses
          studentsWhereClause = `WHERE issuer_id = $1`
          coursesWhereClause = `WHERE issuer_id = $1`
          // For certificates, filter by courses belonging to this issuer
          certificatesWhereClause = `WHERE course_id IN (SELECT id FROM courses WHERE issuer_id = $1) OR course_id IS NULL`
        }
        
        // Get total students count and growth
        const studentsQuery = `
          SELECT 
            COUNT(*) as total_students,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as students_this_month,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' THEN 1 END) as students_last_month
          FROM students
          ${studentsWhereClause}
        `
        const studentsResult = await client.query(studentsQuery, issuerIdParam ? [issuerIdParam] : [])
        const studentsData = studentsResult.rows[0]
        
        // Calculate students growth percentage
        const studentsGrowth = studentsData.students_last_month > 0 
          ? Math.round(((studentsData.students_this_month - studentsData.students_last_month) / studentsData.students_last_month) * 100)
          : studentsData.students_this_month > 0 ? 100 : 0

        // Get certificates count and growth
        const certificatesQuery = `
          SELECT 
            COUNT(*) as total_certificates,
            COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_certificates,
            COUNT(CASE WHEN issued_date >= NOW() - INTERVAL '30 days' THEN 1 END) as certificates_this_month,
            COUNT(CASE WHEN issued_date >= NOW() - INTERVAL '60 days' AND issued_date < NOW() - INTERVAL '30 days' THEN 1 END) as certificates_last_month
          FROM certificates
          ${certificatesWhereClause}
        `
        const certificatesResult = await client.query(certificatesQuery, issuerIdParam ? [issuerIdParam] : [])
        const certificatesData = certificatesResult.rows[0]
        
        // Calculate certificates growth percentage
        const certificatesGrowth = certificatesData.certificates_last_month > 0 
          ? Math.round(((certificatesData.certificates_this_month - certificatesData.certificates_last_month) / certificatesData.certificates_last_month) * 100)
          : certificatesData.certificates_this_month > 0 ? 100 : 0

        // Get courses count and growth
        const coursesQuery = `
          SELECT 
            COUNT(*) as total_courses,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as courses_this_week,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' THEN 1 END) as courses_last_week
          FROM courses
          ${coursesWhereClause}
        `
        const coursesResult = await client.query(coursesQuery, issuerIdParam ? [issuerIdParam] : [])
        const coursesData = coursesResult.rows[0]
        
        // Calculate courses growth
        const coursesGrowth = parseInt(coursesData.courses_this_week) - parseInt(coursesData.courses_last_week)

        // Get active certificates growth
        const activeCertificatesQuery = `
          SELECT 
            COUNT(CASE WHEN status = 'Active' AND issued_date >= NOW() - INTERVAL '30 days' THEN 1 END) as active_this_month,
            COUNT(CASE WHEN status = 'Active' AND issued_date >= NOW() - INTERVAL '60 days' AND issued_date < NOW() - INTERVAL '30 days' THEN 1 END) as active_last_month
          FROM certificates
          ${certificatesWhereClause}
        `
        const activeCertificatesResult = await client.query(activeCertificatesQuery, issuerIdParam ? [issuerIdParam] : [])
        const activeCertificatesData = activeCertificatesResult.rows[0]
        
        const activeCertificatesGrowth = activeCertificatesData.active_last_month > 0 
          ? Math.round(((activeCertificatesData.active_this_month - activeCertificatesData.active_last_month) / activeCertificatesData.active_last_month) * 100)
          : activeCertificatesData.active_this_month > 0 ? 100 : 0

        // Get issuers count and growth (only for Admin)
        let issuersData = { total_issuers: 0, issuers_this_month: 0, issuers_last_month: 0 }
        let issuersGrowth = 0
        
        if (userRole === 'Admin') {
          const issuersQuery = `
            SELECT 
              COUNT(*) as total_issuers,
              COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as issuers_this_month,
              COUNT(CASE WHEN created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' THEN 1 END) as issuers_last_month
            FROM issuers
          `
          const issuersResult = await client.query(issuersQuery)
          issuersData = issuersResult.rows[0]
          
          // Calculate issuers growth percentage
          issuersGrowth = issuersData.issuers_last_month > 0 
            ? Math.round(((issuersData.issuers_this_month - issuersData.issuers_last_month) / issuersData.issuers_last_month) * 100)
            : issuersData.issuers_this_month > 0 ? 100 : 0
        }

        const stats = {
          totalStudents: parseInt(studentsData.total_students) || 0,
          totalCertificates: parseInt(certificatesData.total_certificates) || 0,
          totalCourses: parseInt(coursesData.total_courses) || 0,
          totalIssuers: parseInt(issuersData.total_issuers) || 0,
          activeCertificates: parseInt(certificatesData.active_certificates) || 0,
          studentsGrowth: studentsGrowth,
          certificatesGrowth: certificatesGrowth,
          coursesGrowth: coursesGrowth,
          issuersGrowth: issuersGrowth,
          activeCertificatesGrowth: activeCertificatesGrowth,
          userRole: userRole
        }

        res.json({
          success: true,
          stats: stats
        })

      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Dashboard stats error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard stats'
      })
    }
  },

  // Lấy chứng chỉ gần đây
  getRecentCertificates: async (req, res) => {
    try {
      const client = await db.pool.connect()
      
      try {
        const query = `
          SELECT 
            c.id,
            COALESCE(c.recipient_name, 'Unknown Student') as student_name,
            COALESCE(co.course_name, c.course_name, c.certificate_name) as course_name,
            c.issued_date as issue_date,
            CASE 
              WHEN c.expire_date < NOW() THEN 'Expired'
              ELSE c.status
            END as status
          FROM certificates c
          LEFT JOIN courses co ON c.course_id = co.id
          WHERE c.issued_date >= NOW() - INTERVAL '7 days'
          ORDER BY c.issued_date DESC
          LIMIT 10
        `
        
        const result = await client.query(query)
        
        res.json({
          success: true,
          certificates: result.rows
        })

      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Recent certificates error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent certificates'
      })
    }
  },

  // Lấy học viên mới tạo
  getRecentStudents: async (req, res) => {
    try {
      const client = await db.pool.connect()
      
      try {
        const query = `
          SELECT 
            id as student_id,
            name,
            email,
            created_at,
            wallet_address,
            CASE 
              WHEN wallet_address IS NOT NULL AND wallet_address != '' THEN true
              ELSE false
            END as has_wallet
          FROM students
          WHERE created_at >= NOW() - INTERVAL '7 days'
          ORDER BY created_at DESC
          LIMIT 10
        `
        
        const result = await client.query(query)
        
        res.json({
          success: true,
          students: result.rows
        })

      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Recent students error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent students'
      })
    }
  }
}

module.exports = dashboardController