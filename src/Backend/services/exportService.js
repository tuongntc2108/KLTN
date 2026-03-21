const ExcelJS = require('exceljs');
const db = require('../config/pg');

/**
 * Export toàn bộ dữ liệu theo role
 * @param {string} role - 'Admin' hoặc 'Issuer'
 * @param {number|null} issuerId - Chỉ dùng khi role = 'Issuer'
 * @returns {Promise<Buffer>} - Excel file buffer
 */
async function generateExport(role, issuerId = null) {
  const workbook = new ExcelJS.Workbook();
  
  // Metadata
  workbook.creator = 'MySBT System';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  if (role === 'Admin') {
    await addIssuersSheet(workbook);
    await addStudentsSheet(workbook, null);
    await addCoursesSheet(workbook, null);
    await addCertificatesSheet(workbook, null);
  } else if (role === 'Issuer') {
    // Issuer chỉ thấy dữ liệu của họ
    await addStudentsSheet(workbook, issuerId);
    await addCoursesSheet(workbook, issuerId);
    await addCertificatesSheet(workbook, issuerId);
  }
  
  // Convert to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Thêm sheet Issuers (chỉ Admin)
 */
async function addIssuersSheet(workbook) {
  const sheet = workbook.addWorksheet('Issuers');
  
  // Define columns
  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 35 },
    { header: 'Wallet Address', key: 'wallet_address', width: 45 },
    { header: 'Organization', key: 'organization', width: 30 },
    { header: 'Website', key: 'website', width: 40 },
    { header: 'Created At', key: 'created_at', width: 20 }
  ];
  
  // Query
  const result = await db.pool.query('SELECT * FROM issuers ORDER BY id');
  
  // Add rows
  sheet.addRows(result.rows);
  
  // Style header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Auto filter
  sheet.autoFilter = {
    from: 'A1',
    to: 'G1'
  };
}

/**
 * Thêm sheet Students
 */
async function addStudentsSheet(workbook, issuerId) {
  const sheet = workbook.addWorksheet('Students');
  
  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 35 },
    { header: 'Wallet Address', key: 'wallet_address', width: 45 },
    { header: 'Issuer ID', key: 'issuer_id', width: 12 },
    { header: 'Created At', key: 'created_at', width: 20 }
  ];
  
  // Query với filter issuer nếu cần
  let query = 'SELECT * FROM students';
  let params = [];
  
  if (issuerId) {
    query += ' WHERE issuer_id = $1';
    params.push(issuerId);
  }
  
  query += ' ORDER BY id';
  
  const result = await db.pool.query(query, params);
  sheet.addRows(result.rows);
  
  // Style header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Auto filter
  sheet.autoFilter = {
    from: 'A1',
    to: 'F1'
  };
}

/**
 * Thêm sheet Courses
 */
async function addCoursesSheet(workbook, issuerId) {
  const sheet = workbook.addWorksheet('Courses');
  
  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Issuer ID', key: 'issuer_id', width: 12 },
    { header: 'Course Name', key: 'course_name', width: 40 },
    { header: 'Description', key: 'course_description', width: 50 },
    { header: 'Duration', key: 'duration', width: 15 },
    { header: 'Created At', key: 'created_at', width: 20 },
    { header: 'Updated At', key: 'updated_at', width: 20 }
  ];
  
  let query = 'SELECT * FROM courses';
  let params = [];
  
  if (issuerId) {
    query += ' WHERE issuer_id = $1';
    params.push(issuerId);
  }
  
  query += ' ORDER BY id';
  
  const result = await db.pool.query(query, params);
  sheet.addRows(result.rows);
  
  // Style header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Auto filter
  sheet.autoFilter = {
    from: 'A1',
    to: 'G1'
  };
}

/**
 * Thêm sheet Certificates
 */
async function addCertificatesSheet(workbook, issuerId) {
  const sheet = workbook.addWorksheet('Certificates');
  
  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Token ID', key: 'token_id', width: 15 },
    { header: 'Verification Code', key: 'verification_code', width: 25 },
    { header: 'Certificate Name', key: 'certificate_name', width: 40 },
    { header: 'Recipient Name', key: 'recipient_name', width: 30 },
    { header: 'Holder', key: 'holder', width: 45 },
    { header: 'Issuer', key: 'issuer', width: 45 },
    { header: 'Course ID', key: 'course_id', width: 12 },
    { header: 'Course Name', key: 'course_name', width: 40 },
    { header: 'Student ID', key: 'student_id', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Issued Date', key: 'issued_date', width: 20 },
    { header: 'Expire Date', key: 'expire_date', width: 20 },
    { header: 'Metadata URI', key: 'metadata_uri', width: 60 },
    { header: 'Data Hash', key: 'data_hash', width: 68 },
    { header: 'Created At', key: 'created_at', width: 20 }
  ];
  
  let query = 'SELECT * FROM certificates';
  let params = [];
  
  if (issuerId) {
    // Filter bằng cách join với courses hoặc check certificate thuộc issuer
    query += ' WHERE course_id IN (SELECT id FROM courses WHERE issuer_id = $1) OR (course_id IS NULL AND issuer IN (SELECT wallet_address FROM issuers WHERE id = $1))';
    params.push(issuerId);
  }
  
  query += ' ORDER BY id';
  
  const result = await db.pool.query(query, params);
  sheet.addRows(result.rows);
  
  // Style header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Auto filter
  sheet.autoFilter = {
    from: 'A1',
    to: 'P1'
  };
}

module.exports = { generateExport };
