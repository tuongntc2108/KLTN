require("dotenv").config();
const { ethers } = require("ethers");
const db = require("../config/pg");
const path = require("path");
const MySBT = require(path.join(__dirname, "..", "..", "SmartContract", "artifacts", "contracts", "MySBT.sol", "MySBT.json")); // ABI của bạn

const STATUS = ["Issued","Active","Expired","Revoked","Replaced"];
const JOB = "mysbt-sync";

const toDate = (secOrMs) => {
  // on-chain là seconds (uint256)
  const n = Number(secOrMs);
  return new Date(n * 1000);
};

async function upsertCertificateFromStruct(tokenId, cert) {
  const q = `
    INSERT INTO certificates (
      token_id, metadata_uri, holder, issuer, issued_date, expire_date, status,
      course_id, student_id, verification_code, certificate_type, recipient_name, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
    ON CONFLICT (token_id) DO UPDATE SET
      metadata_uri=EXCLUDED.metadata_uri,
      holder=EXCLUDED.holder,
      issuer=EXCLUDED.issuer,
      issued_date=EXCLUDED.issued_date,
      expire_date=EXCLUDED.expire_date,
      status=EXCLUDED.status,
      course_id=EXCLUDED.course_id,
      student_id=EXCLUDED.student_id,
      verification_code=EXCLUDED.verification_code,
      certificate_type=EXCLUDED.certificate_type,
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
    cert.certificateType,
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

  // Issued
  const issued = await contract.queryFilter(contract.filters.CertificateIssued(), fromBlock, toBlock);
  for (const log of issued) {
    const { tokenId } = log.args;
    const cert = await contract.certificates(tokenId);
    await upsertCertificateFromStruct(tokenId.toString(), cert);
    await insertEvent({
      tokenId, type: "Issued",
      issuer: cert.issuer, holder: cert.holder,
      blockNumber: log.blockNumber, txHash: log.transactionHash
    });
  }

  // Claimed
  const claimed = await contract.queryFilter(contract.filters.CertificateClaimed(), fromBlock, toBlock);
  for (const log of claimed) {
    const { tokenId, holder } = log.args;
    await db.query(`UPDATE certificates SET status='Active', holder=$1, updated_at=NOW() WHERE token_id=$2`,
                   [holder, tokenId.toString()]);
    await insertEvent({ tokenId, type: "Claimed", holder, blockNumber: log.blockNumber, txHash: log.transactionHash });
  }

  // Revoked
  const revoked = await contract.queryFilter(contract.filters.CertificateRevoked(), fromBlock, toBlock);
  for (const log of revoked) {
    const { tokenId, issuer, reason } = log.args;
    await db.query(`UPDATE certificates SET status='Revoked', updated_at=NOW() WHERE token_id=$1`,
                   [tokenId.toString()]);
    await insertEvent({ tokenId, type: "Revoked", issuer, reason, blockNumber: log.blockNumber, txHash: log.transactionHash });
  }

  // Expired
  const expired = await contract.queryFilter(contract.filters.CertificateExpired(), fromBlock, toBlock);
  for (const log of expired) {
    const { tokenId } = log.args;
    await db.query(`UPDATE certificates SET status='Expired', updated_at=NOW() WHERE token_id=$1`,
                   [tokenId.toString()]);
    await insertEvent({ tokenId, type: "Expired", blockNumber: log.blockNumber, txHash: log.transactionHash });
  }

  // Replaced
  const replaced = await contract.queryFilter(contract.filters.CertificateReplaced(), fromBlock, toBlock);
  for (const log of replaced) {
    const { oldTokenId, newTokenId } = log.args;
    // old → Replaced
    await db.query(`UPDATE certificates SET status='Replaced', updated_at=NOW() WHERE token_id=$1`,
                   [oldTokenId.toString()]);
    // new → upsert struct
    const cert = await contract.certificates(newTokenId);
    await upsertCertificateFromStruct(newTokenId.toString(), cert);
    await insertEvent({
      tokenId: oldTokenId, type: "Replaced", relatedToken: newTokenId,
      blockNumber: log.blockNumber, txHash: log.transactionHash
    });
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const latest = await provider.getBlockNumber();
  const from = await getCursor(0);
  const to = latest;
  if (from <= to) {
    await runOnce(from, to);
    await setCursor(to);
  }
  console.log(`Synced blocks ${from} → ${to}`);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { main };
