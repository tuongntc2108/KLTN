const axios = require('axios');
const http = require('http');
const https = require('https');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

/**
 * Send email notification via n8n webhook
 * @param {Object} notificationData - Data to send to n8n webhook
 * @returns {Promise<boolean>} - Returns true if notification sent successfully
 */
async function sendNotification(notificationData) {
  try {
    console.log('📧 Sending email notification via n8n webhook:', notificationData);
    
    const payload = JSON.stringify(notificationData);
    const webhookUrl = new URL(N8N_WEBHOOK_URL);
    
    // Chọn http hoặc https module dựa vào protocol
    const protocol = webhookUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: webhookUrl.hostname,
      port: webhookUrl.port || (webhookUrl.protocol === 'https:' ? 443 : 80),
      path: webhookUrl.pathname + webhookUrl.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    console.log('🔧 Request options:', options);

    return new Promise((resolve, reject) => {
      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          console.log('✅ Email notification sent successfully:', res.statusCode);
          console.log('📥 Response:', data);
          resolve(true);
        });
      });

      req.on('error', (error) => {
        console.error('❌ Failed to send email notification:', error.message);
        resolve(false);
      });

      req.write(payload);
      req.end();
    });
  } catch (error) {
    console.error('❌ Failed to send email notification:', error.message);
    return false;
  }
}

/**
 * Format date to YYYY-MM-DD format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string (YYYY-MM-DD) or null if invalid
 */
function formatDateToYYYYMMDD(date) {
  if (!date) return null;
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date provided to formatDateToYYYYMMDD:', date);
    return null;
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Notify student when certificate is issued/created
 */
async function notifyCertificateIssued(studentEmail, studentName, certificateData) {
  const notificationData = {
    event_type: 'certificate_issued',
    recipient_email: studentEmail,
    recipient_name: studentName,
    certificate: {
      token_id: certificateData.token_id,
      certificate_name: certificateData.certificate_name,
      course_name: certificateData.course_name,
      issued_date: certificateData.issued_date,
      expire_date: certificateData.expire_date,
      status: 'Issued'
    }
  };

  return await sendNotification(notificationData);
}

/**
 * Notify student when certificate is claimed/activated
 */
async function notifyCertificateClaimed(studentEmail, studentName, certificateData) {
  const notificationData = {
    event_type: 'certificate_claimed',
    recipient_email: studentEmail,
    recipient_name: studentName,
    certificate: {
      token_id: certificateData.token_id,
      certificate_name: certificateData.certificate_name,
      course_name: certificateData.course_name,
      issued_date: formatDateToYYYYMMDD(certificateData.issued_date),
      expire_date: formatDateToYYYYMMDD(certificateData.expire_date),
      transaction_hash: certificateData.transaction_hash,
      status: 'Active'
    }
  };

  return await sendNotification(notificationData);
}

/**
 * Notify student when certificate is replaced
 */
async function notifyCertificateReplaced(studentEmail, studentName, oldCertificateData, newCertificateData) {
  const notificationData = {
    event_type: 'certificate_replaced',
    recipient_email: studentEmail,
    recipient_name: studentName,
    old_certificate: {
      token_id: oldCertificateData.token_id,
      certificate_name: oldCertificateData.certificate_name
    },
    new_certificate: {
      token_id: newCertificateData.token_id,
      certificate_name: newCertificateData.certificate_name,
      course_name: newCertificateData.course_name,
      issued_date: newCertificateData.issued_date,
      expire_date: newCertificateData.expire_date,
      status: 'Issued'
    }
  };

  return await sendNotification(notificationData);
}

/**
 * Notify student when certificate is revoked
 */
async function notifyCertificateRevoked(studentEmail, studentName, certificateData, reason) {
  const notificationData = {
    event_type: 'certificate_revoked',
    recipient_email: studentEmail,
    recipient_name: studentName,
    certificate: {
      token_id: certificateData.token_id,
      certificate_name: certificateData.certificate_name,
      course_name: certificateData.course_name,
      revoke_reason: reason,
      status: 'Revoked'
    }
  };

  return await sendNotification(notificationData);
}

/**
 * Notify student when certificate is expired
 */
async function notifyCertificateExpired(studentEmail, studentName, certificateData) {
  const notificationData = {
    event_type: 'certificate_expired',
    recipient_email: studentEmail,
    recipient_name: studentName,
    certificate: {
      token_id: certificateData.token_id,
      certificate_name: certificateData.certificate_name,
      course_name: certificateData.course_name,
      expire_date: formatDateToYYYYMMDD(certificateData.expire_date),
      status: 'Expired'
    }
  };

  return await sendNotification(notificationData);
}

module.exports = {
  sendNotification,
  notifyCertificateIssued,
  notifyCertificateClaimed,
  notifyCertificateReplaced,
  notifyCertificateRevoked,
  notifyCertificateExpired
};
