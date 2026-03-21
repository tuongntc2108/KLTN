const { getUserRole } = require('../utils/userUtils');
const { generateExport } = require('../services/exportService');
const db = require('../config/pg');

const exportController = {
  /**
   * Export dữ liệu theo role (Admin hoặc Issuer)
   * GET /api/export
   */
  exportData: async (req, res) => {
    try {
      const userEmail = req.user?.email;
      
      if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Get role
      const role = await getUserRole(userEmail);
      
      // Chỉ Admin và Issuer được export
      if (role !== 'Admin' && role !== 'Issuer') {
        return res.status(403).json({ 
          error: 'Forbidden: Only Admin and Issuer can export reports' 
        });
      }
      
      let issuerId = null;
      
      // Nếu là Issuer, lấy issuer_id
      if (role === 'Issuer') {
        const issuerQuery = await db.pool.query(
          'SELECT id FROM issuers WHERE email = $1',
          [userEmail]
        );
        
        if (issuerQuery.rows.length === 0) {
          return res.status(403).json({ error: 'Issuer not found' });
        }
        
        issuerId = issuerQuery.rows[0].id;
      }
      
      console.log(`[Export] User: ${userEmail}, Role: ${role}, IssuerId: ${issuerId}`);
      
      // Generate Excel
      const buffer = await generateExport(role, issuerId);
      
      // Tạo filename với timestamp
      const now = new Date();
      const timestamp = now.toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '_')
        .slice(0, 15); // yyyymmdd_hhmmss
      const filename = `report_${role.toLowerCase()}_${timestamp}.xlsx`;
      
      console.log(`[Export] Generated file: ${filename}, Size: ${buffer.length} bytes`);
      
      // Set headers và send file
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.setHeader(
        'Content-Length',
        buffer.length
      );
      
      res.send(buffer);
      
    } catch (error) {
      console.error('[Export] Error:', error);
      res.status(500).json({ 
        error: 'Export failed', 
        details: error.message 
      });
    }
  }
};

module.exports = exportController;
