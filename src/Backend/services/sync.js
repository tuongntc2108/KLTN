require("dotenv").config();
const { ethers } = require("ethers");
const db = require("../config/pg");
const path = require("path");
const getMySBTArtifact = () => {
  const artifactPath = path.join(__dirname, "..", "..", "SmartContract", "artifacts", "contracts", "MySBT.sol", "MySBT.json");
  const backendAbiPath = path.join(__dirname, "..", "abi", "MySBT.json");

  try {
    return require(artifactPath);
  } catch (error) {
    return require(backendAbiPath);
  }
};

const MySBT = getMySBTArtifact(); // ABI smart contract
const emailNotificationService = require("../services/emailNotificationService");

const STATUS = ["Issued", "Active", "Expired", "Revoked", "Replaced"];
const JOB = "mysbt-sync";

// Rate limiting configuration
const BATCH_SIZE = 1000; // Process blocks in smaller batches
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry failed operations
async function retryOperation(operation, maxRetries = MAX_RETRIES) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Check if it's a rate limit error
      // Đây là lỗi từ Ethereum RPC provider (ví dụ: Infura, Alchemy) khi gửi quá nhiều requests trong thời gian ngắn
      if (error.code === 'BAD_DATA' && error.value && error.value.some(v => v.code === -32005)) {
        console.log(`Rate limited, waiting ${RETRY_DELAY * (i + 1)}ms before retry ${i + 1}/${maxRetries}`);
        await delay(RETRY_DELAY * (i + 1));
        continue;
      }

      // For other errors, wait a bit and retry
      console.log(`Operation failed, retrying ${i + 1}/${maxRetries}:`, error.message);
      await delay(1000);
    }
  }
}

const toDate = (secOrMs) => {
  // on-chain là seconds (uint256)
  const n = Number(secOrMs);
  return new Date(n * 1000);
};

async function upsertCertificateFromStruct(tokenId, cert, metadata = {}) {
  const q = `
    INSERT INTO certificates (
      token_id, metadata_uri, holder, issuer, issued_date, expire_date, status,
      course_name, course_id, student_id, verification_code, certificate_name, recipient_name, data_hash, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
    ON CONFLICT (token_id) DO UPDATE SET
      metadata_uri=EXCLUDED.metadata_uri,
      holder=EXCLUDED.holder,
      issuer=EXCLUDED.issuer,
      issued_date=EXCLUDED.issued_date,
      expire_date=EXCLUDED.expire_date,
      status=EXCLUDED.status,
      course_name=COALESCE(EXCLUDED.course_name, certificates.course_name),
      course_id=COALESCE(EXCLUDED.course_id, certificates.course_id),
      student_id=COALESCE(EXCLUDED.student_id, certificates.student_id),
      verification_code=EXCLUDED.verification_code,
      certificate_name=COALESCE(EXCLUDED.certificate_name, certificates.certificate_name),
      recipient_name=COALESCE(EXCLUDED.recipient_name, certificates.recipient_name),
      data_hash=EXCLUDED.data_hash,
      updated_at=NOW();
  `;
  let courseIdInt = null;
  let courseName = null;

  if (cert.courseId !== undefined && cert.courseId !== null) {
    const asNum = Number(cert.courseId);
    courseIdInt = parseInt(asNum);
    try {
      const r = await db.query('SELECT id, course_name FROM courses WHERE id=$1 LIMIT 1', [courseIdInt]);
      console.log('[SYNC] Lookup courseId:', courseIdInt, 'Result:', r.rows);
      if (r.rows && r.rows.length > 0) {
        courseName = r.rows[0].course_name;
      } else {
        courseName = null;
        courseIdInt = null;
      }
    } catch (err) {
      console.warn('Could not fetch course name for id', courseIdInt, err.message);
      courseName = null;
      courseIdInt = null;
    }
  }

  const certificateName = metadata.certificate_name || cert.certificateName || null;
  const recipientName = metadata.recipient_name || cert.recipientName || null;
  const studentId = metadata.student_id || cert.studentId || null;

  const params = [
    tokenId,
    cert.metadataURI,
    cert.holder,
    cert.issuer,
    toDate(cert.issuedDate),
    toDate(cert.expireDate),
    STATUS[Number(cert.status)],
    courseName,
    courseIdInt,
    studentId,
    cert.verificationCode,
    certificateName,
    recipientName,
    cert.dataHash || null
  ];

  await db.query(q, params);
}

async function insertEvent({ tokenId, type, reason, relatedToken, blockNumber, txHash }) {
  // Kiểm tra xem event đã tồn tại chưa (unique theo token_id + event_type)
  const checkQuery = `
    SELECT id FROM certificate_events 
    WHERE token_id = $1 AND event_type = $2
    LIMIT 1
  `;
  const existing = await db.query(checkQuery, [tokenId?.toString(), type]);

  if (existing.rows.length > 0) {
    console.log(`⚠️ Event ${type} for token ${tokenId} already exists, skipping insert`);
    return;
  }

  // Nếu chưa tồn tại, insert mới
  const q = `
    INSERT INTO certificate_events
      (token_id, event_type, reason, related_token, block_number, tx_hash)
    VALUES ($1,$2,$3,$4,$5,$6)
  `;
  await db.query(q, [
    tokenId?.toString(), type,
    reason || null, relatedToken ? relatedToken.toString() : null,
    blockNumber, txHash
  ]);
  console.log(`✅ Inserted ${type} event for token ${tokenId}`);
}

async function setCursor(block) {
  await db.query(
    `INSERT INTO sync_cursors (job_name, last_block, updated_at)
     VALUES ($1,$2,NOW())
     ON CONFLICT (job_name) DO UPDATE SET last_block=EXCLUDED.last_block, updated_at=NOW()`,
    [JOB, block]
  );
}

async function getCursor(defaultBlock) {
  const r = await db.query("SELECT last_block FROM sync_cursors WHERE job_name=$1", [JOB]);
  if (r.rows.length) return Number(r.rows[0].last_block);
  return Number(process.env.START_BLOCK || defaultBlock || 0);
}

async function runOnce(fromBlock, toBlock) {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, MySBT.abi, provider);

  // Process events with retry logic
  const processEvents = async (filter, eventType, processor) => {
    try {
      const logs = await retryOperation(() =>
        contract.queryFilter(filter, fromBlock, toBlock)
      );

      for (const log of logs) {
        await processor(log);
      }

      return logs.length;
    } catch (error) {
      console.error(`Error processing ${eventType} events:`, error.message);
      return 0;
    }
  };

  // Lắng nghe các sự kiện onchain

  // Issued
  const issuedCount = await processEvents(
    contract.filters.CertificateIssued(),
    "Issued",
    async (log) => {
      const { tokenId } = log.args;
      const cert = await retryOperation(() => contract.certificates(tokenId));
      await upsertCertificateFromStruct(tokenId.toString(), cert);
      await insertEvent({
        tokenId, type: "Issued",
        blockNumber: log.blockNumber, txHash: log.transactionHash
      });
    }
  );

  // Claimed
  const claimedCount = await processEvents(
    contract.filters.CertificateClaimed(),
    "Claimed",
    async (log) => {
      const { tokenId, holder } = log.args;
      await db.query(`UPDATE certificates SET status='Active', holder=$1, updated_at=NOW() WHERE token_id=$2`,
        [holder, tokenId.toString()]);
      await insertEvent({ tokenId, type: "Claimed", blockNumber: log.blockNumber, txHash: log.transactionHash });
    }
  );

  // Revoked
  const revokedCount = await processEvents(
    contract.filters.CertificateRevoked(),
    "Revoked",
    async (log) => {
      const { tokenId, issuer, reason } = log.args;
      await db.query(`UPDATE certificates SET status='Revoked', updated_at=NOW() WHERE token_id=$1`,
        [tokenId.toString()]);
      await insertEvent({ tokenId, type: "Revoked", reason, blockNumber: log.blockNumber, txHash: log.transactionHash });
    }
  );

  // Expired
  const expiredCount = await processEvents(
    contract.filters.CertificateExpired(),
    "Expired",
    async (log) => {
      const { tokenId } = log.args;
      console.log(`🔍 Processing CertificateExpired event for token ${tokenId}`);
      console.log(`📊 Blockchain data: block=${log.blockNumber}, tx=${log.transactionHash}`);

      await db.query(`UPDATE certificates SET status='Expired', updated_at=NOW() WHERE token_id=$1`,
        [tokenId.toString()]);

      // Check existing events before inserting
      const existingEvents = await db.query(
        `SELECT id, tx_hash, block_number FROM certificate_events 
         WHERE token_id = $1 AND event_type = 'Expired'
         ORDER BY created_at DESC`,
        [tokenId.toString()]
      );

      console.log(`📋 Existing events for token ${tokenId}:`, existingEvents.rows);

      await insertEvent({ tokenId, type: "Expired", blockNumber: log.blockNumber, txHash: log.transactionHash });

      // Update with more specific targeting
      const updateResult = await db.query(
        `UPDATE certificate_events 
         SET block_number = $1, tx_hash = $2
         WHERE token_id = $3 AND event_type = 'Expired' AND tx_hash = 'SYSTEM_EXPIRED'
         RETURNING id`,
        [log.blockNumber, log.transactionHash, tokenId.toString()]
      );

      console.log(`✅ Updated ${updateResult.rowCount} events for token ${tokenId}`);
    }
  );

  // Replaced
  const replacedCount = await processEvents(
    contract.filters.CertificateReplaced(),
    "Replaced",
    async (log) => {
      const { oldTokenId, newTokenId } = log.args;
      // old → Replaced
      await db.query(`UPDATE certificates SET status='Replaced', updated_at=NOW() WHERE token_id=$1`,
        [oldTokenId.toString()]);
      // new → upsert struct
      const cert = await retryOperation(() => contract.certificates(newTokenId));
      await upsertCertificateFromStruct(newTokenId.toString(), cert);
      await insertEvent({
        tokenId: oldTokenId, type: "Replaced", relatedToken: newTokenId,
        blockNumber: log.blockNumber, txHash: log.transactionHash
      });
    }
  );

  console.log(`Processed events: Issued: ${issuedCount}, Claimed: ${claimedCount}, Revoked: ${revokedCount}, Expired: ${expiredCount}, Replaced: ${replacedCount}`);
}

// Function để kiểm tra và cập nhật trạng thái hết hạn (theo thời gian, offchain)
async function checkAndUpdateExpiredCertificates() {
  try {
    console.log('🔍 Checking for expired certificates...');

    // Lấy danh sách chứng chỉ có thể hết hạn
    const query = `
      SELECT token_id, expire_date, status 
      FROM certificates 
      WHERE status IN ('Issued', 'Active') 
        AND expire_date < NOW()
    `;

    const result = await db.query(query);
    const expiredCerts = result.rows;

    if (expiredCerts.length === 0) {
      console.log('✅ No expired certificates found');
      return 0;
    }

    console.log(`📅 Found ${expiredCerts.length} expired certificates`);

    let updatedCount = 0;

    for (const cert of expiredCerts) {
      try {
        // Cập nhật trạng thái trong database
        await db.query(
          `UPDATE certificates SET status='Expired', updated_at=NOW() WHERE token_id=$1`,
          [cert.token_id]
        );

        // Thêm event vào database với block number hiện tại
        try {
          const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
          const currentBlock = await provider.getBlockNumber();
          await insertEvent({
            tokenId: cert.token_id,
            type: "Expired",
            blockNumber: currentBlock,
            txHash: "SYSTEM_EXPIRED" // Đánh dấu đây là event được tạo bởi system
          });
        } catch (eventError) {
          console.warn(`⚠️ Failed to insert expired event for token ${cert.token_id}:`, eventError.message);
        }

        updatedCount++;

      } catch (error) {
        console.error(`❌ Error updating expired certificate ${cert.token_id}:`, error.message);
      }
    }

    // Send email notifications for each expired certificate
    let emailSentCount = 0;
    for (const cert of expiredCerts) {
      try {
        // Get student email from database
        const studentResult = await db.query(
          `SELECT email, name FROM students WHERE id = $1`,
          [cert.student_id]
        );

        if (studentResult.rows.length > 0) {
          const student = studentResult.rows[0];
          await emailNotificationService.notifyCertificateExpired(
            student.email,
            student.name,
            {
              token_id: cert.token_id,
              certificate_name: cert.certificate_name,
              course_name: cert.course_name,
              expire_date: cert.expire_date
            }
          );
          emailSentCount++;
        }
      } catch (emailError) {
        console.error(`❌ Failed to send email for certificate ${cert.token_id}:`, emailError.message);
        // Continue with other certificates
      }
    }

    console.log(`📧 Email notifications sent for ${emailSentCount}/${expiredCerts.length} expired certificates`);

    console.log(`✅ Successfully updated ${updatedCount}/${expiredCerts.length} expired certificates`);
    return updatedCount;

  } catch (error) {
    console.error('❌ Error checking expired certificates:', error.message);
    return 0;
  }
}

// Cập nhật function main để gọi check expired certificates
async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const latest = await provider.getBlockNumber();
  const from = await getCursor(0);
  const to = latest;

  if (from <= to) {
    console.log(`Starting sync from block ${from} to ${latest} (${latest - from} blocks)`);

    // Process blocks in batches to avoid rate limiting
    for (let currentFrom = from; currentFrom <= to; currentFrom += BATCH_SIZE) {
      const currentTo = Math.min(currentFrom + BATCH_SIZE - 1, to);

      console.log(`Processing batch: blocks ${currentFrom} → ${currentTo}`);

      try {
        await runOnce(currentFrom, currentTo);
        await setCursor(currentTo);
        console.log(`Successfully synced batch ${currentFrom} → ${currentTo}`);

        // Add delay between batches to respect rate limits
        if (currentTo < to) {
          console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
          await delay(DELAY_BETWEEN_BATCHES);
        }
      } catch (error) {
        console.error(`Error syncing batch ${currentFrom} → ${currentTo}:`, error.message);
        // Continue with next batch instead of failing completely
        continue;
      }
    }
  }

  // Kiểm tra và cập nhật trạng thái hết hạn sau khi sync events
  console.log('🔄 Checking expired certificates...');
  const expiredCount = await checkAndUpdateExpiredCertificates();

  console.log(`Sync completed. Final block: ${to}, Updated expired: ${expiredCount}`);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

// Export helper function for immediate sync after mint
exports.syncCertificateImmediately = async (tokenId, metadata = {}) => {
  try {
    console.log(`🔄 Starting immediate sync for certificate ${tokenId}`);
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const MySBTAbi = getMySBTArtifact().abi;
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, MySBTAbi, provider);

    // Use retry logic for getting certificate data
    const cert = await retryOperation(() => contract.certificates(tokenId));

    if (!cert || cert.holder === ethers.ZeroAddress) {
      throw new Error(`Certificate ${tokenId} not found on blockchain`);
    }

    console.log(`🗺️ Certificate data from blockchain:`, {
      holder: cert.holder,
      issuer: cert.issuer,
      status: STATUS[Number(cert.status)] || "Issued",
      metadataURI: cert.metadataURI
    });

    await upsertCertificateFromStruct(tokenId.toString(), cert, metadata);

    // Verify the insert/update worked
    const verifyResult = await db.query(
      'SELECT token_id, status, recipient_name, certificate_name, course_name FROM certificates WHERE token_id = $1',
      [tokenId.toString()]
    );

    if (verifyResult.rows.length === 0) {
      throw new Error(`Certificate ${tokenId} was not saved to database`);
    }

    console.log(`✅ Certificate ${tokenId} synced immediately and verified in database:`, verifyResult.rows[0]);
    return true;
  } catch (error) {
    console.error(`❌ Failed to sync certificate ${tokenId}:`, error.message);
    console.error('Full error:', error);
    return false;
  }
};

exports.main = main;
exports.insertEvent = insertEvent;