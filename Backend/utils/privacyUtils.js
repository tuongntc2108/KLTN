const crypto = require("crypto");

const normalizeValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
};

const buildCertificateHashSource = (data) => {
  const parts = [
    normalizeValue(data.student_id),
    normalizeValue(data.recipient_name),
    normalizeValue(data.certificate_name),
    normalizeValue(data.course_id),
    normalizeValue(data.issued_date)
  ];

  return parts.join("|");
};

const generateCertificateDataHash = (data) => {
  const source = buildCertificateHashSource(data);
  return crypto.createHash("sha256").update(source).digest("hex");
};

module.exports = {
  generateCertificateDataHash
};
