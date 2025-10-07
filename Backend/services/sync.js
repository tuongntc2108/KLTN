require("dotenv").config();
const { ethers } = require("ethers");
const db = require("../config/pg");
const path = require("path");
const MySBT = require(path.join(__dirname, "..", "..", "SmartContract", "artifacts", "contracts", "MySBT.sol", "MySBT.json")); // ABI của bạn

const STATUS = ["Issued","Active","Expired","Revoked","Replaced"];
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

async function upsertCertificateFromStruct(tokenId, cert) {
  const q = `
    INSERT INTO certificates (
      token_id, metadata_uri, holder, issuer, issued_date, expire_date, status,
      course_name, student_id, verification_code, certificate_name, recipient_name, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
    ON CONFLICT (token_id) DO UPDATE SET
      metadata_uri=EXCLUDED.metadata_uri,
      holder=EXCLUDED.holder,
      issuer=EXCLUDED.issuer,
      issued_date=EXCLUDED.issued_date,
      expire_date=EXCLUDED.expire_date,
      status=EXCLUDED.status,
      course_name=EXCLUDED.course_name,
      student_id=EXCLUDED.student_id,
      verification_code=EXCLUDED.verification_code,
      certificate_name=EXCLUDED.certificate_name,
      recipient_name=EXCLUDED.recipient_name,
      updated_at=NOW();
  `;
  const params = [
    tokenId,
    cert.metadataURI,
    cert.holder,
    cert.issuer,
    toDate(cert.issuedDate),
    toDate(cert.expireDate),
    STATUS[Number(cert.status)] || "Issued",
    cert.courseId,
    cert.studentId,
    cert.verificationCode,
    cert.certificateName,
    cert.recipientName
  ];
  await db.query(q, params);
}

async function insertEvent({ tokenId, type, issuer, holder, reason, relatedToken, blockNumber, txHash }) {
  const q = `
    INSERT INTO certificate_events
      (token_id, event_type, issuer, holder, reason, related_token, block_number, tx_hash)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `;
  await db.query(q, [
    tokenId?.toString(), type, issuer || null, holder || null,
    reason || null, relatedToken ? relatedToken.toString() : null,
    blockNumber, txHash
  ]);
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
        issuer: cert.issuer, holder: cert.holder,
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
      await insertEvent({ tokenId, type: "Claimed", holder, blockNumber: log.blockNumber, txHash: log.transactionHash });
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
      await insertEvent({ tokenId, type: "Revoked", issuer, reason, blockNumber: log.blockNumber, txHash: log.transactionHash });
    }
  );

  // Expired
  const expiredCount = await processEvents(
    contract.filters.CertificateExpired(),
    "Expired",
    async (log) => {
      const { tokenId } = log.args;
      await db.query(`UPDATE certificates SET status='Expired', updated_at=NOW() WHERE token_id=$1`,
                     [tokenId.toString()]);
      await insertEvent({ tokenId, type: "Expired", blockNumber: log.blockNumber, txHash: log.transactionHash });
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

// Function để kiểm tra và cập nhật trạng thái hết hạn
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
        
        // Gọi smart contract để cập nhật trạng thái (nếu cần)
        try {
          // Tạo wallet từ private key để có thể gọi contract
          const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
          const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
          const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, MySBT.abi, wallet);
          await contract.updateExpiredStatus(cert.token_id);
          console.log(`✅ Updated expired status for token ${cert.token_id} on blockchain`);
        } catch (blockchainError) {
          console.warn(`⚠️ Failed to update blockchain for token ${cert.token_id}:`, blockchainError.message);
          // Vẫn cập nhật database ngay cả khi blockchain fail
        }
        
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
exports.syncCertificateImmediately = async (tokenId) => {
  try {
    console.log(`🔄 Starting immediate sync for certificate ${tokenId}`);
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const MySBTAbi = require(path.join(__dirname, "..", "..", "SmartContract", "artifacts", "contracts", "MySBT.sol", "MySBT.json")).abi;
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
      metadataURI: cert.metadataURI,
      recipientName: cert.recipientName
    });
    
    await upsertCertificateFromStruct(tokenId.toString(), cert);
    
    // Verify the insert/update worked
    const verifyResult = await db.query(
      'SELECT token_id, status, recipient_name, course_name FROM certificates WHERE token_id = $1',
      [tokenId.toString()]
    );
    
    if (verifyResult.rows.length === 0) {
      throw new Error(`Certificate ${tokenId} was not saved to database`);
    }
    
    console.log(`✅ Certificate ${tokenId} synced immediately and verified in database`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to sync certificate ${tokenId}:`, error.message);
    console.error('Full error:', error);
    return false;
  }
};

exports.main = main;
