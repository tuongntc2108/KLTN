const fs = require("fs");
const path = require("path");

let cachedTemplate = null;

function loadTemplate() {
  if (cachedTemplate) {
    return cachedTemplate;
  }

  const templatePath = path.resolve(__dirname, "../../Frontend/template-cert.html");
  cachedTemplate = fs.readFileSync(templatePath, "utf8");
  return cachedTemplate;
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "N/A";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toISOString().split("T")[0];
}

function normalizeExpireDate(dateValue) {
  if (!dateValue) {
    return "Never";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  const iso = date.toISOString().split("T")[0];
  if (iso.startsWith("9999-")) {
    return "Never";
  }

  return iso;
}

function renderCertificateHtml(certificate, { shareUrl }) {
  const template = loadTemplate();

  const issuerName = certificate?.issuer?.name || "Unknown issuer";
  const recipientName = certificate?.recipient?.full_name || "Unknown recipient";
  const courseName = certificate?.certificate_detail?.course_name || "Unknown course";
  const certificateName = certificate?.certificate_detail?.certificate_name || courseName;
  const issueDate = formatDate(certificate?.certificate_detail?.issue_date);
  const expireDate = normalizeExpireDate(certificate?.certificate_detail?.expire_date);
  const status = certificate?.status || "Unknown";
  const tokenId = certificate?.token_id || "";
  const blockchain = certificate?.verification?.blockchain || "Sepolia";
  const smartContract = certificate?.verification?.smart_contract || "";
  const fileHash = certificate?.file_hash?.sha256 || "N/A";
  const courseId =
    certificate?.certificate_detail?.course_id ||
    certificate?.certificate_detail?.courseId ||
    "N/A";

  const description = `The ${certificateName} certificate, issued by ${issuerName}, confirms that the recipient meets the required standards.`;
  const encodedShareUrl = encodeURIComponent(shareUrl || "");
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedShareUrl}`;

  const replacements = {
    issuerName,
    recipientName,
    courseName,
    certificateSubtitle: certificateName,
    description,
    tokenId,
    blockchain,
    issuedDate: issueDate,
    expireDate,
    status,
    courseId,
    smartContract,
    fileHash,
    qrUrl,
    shareUrl,
  };

  let html = template;
  Object.entries(replacements).forEach(([key, value]) => {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(value));
  });

  return html;
}

module.exports = {
  renderCertificateHtml,
};
