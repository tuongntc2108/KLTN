const { contract } = require("../config/blockchain");
const { ethers } = require("ethers");
const db = require("../config/pg");
const {
  parseMetadata,
  getRevocationReason,
  getCertificateEvents,
  getCertificateFromDb,
  buildCertificateViewByTokenId,
} = require("../services/certificateViewService");

exports.verifyByCode = async (req, res) => {
  try {
    const { verificationCode } = req.params;
    if (!verificationCode || typeof verificationCode !== "string") {
      return res.status(400).json({
        success: false,
        message: "Mã xác minh là bắt buộc",
        data: {
          verified: false
        }
      });
    }

    // Call smart contract view to verify by code
    let result;
    try {
      result = await contract.verifyCertificateByCode.staticCall(verificationCode);
    } catch (e) {
      const msg = e?.reason || e?.shortMessage || e?.message || "Mã xác minh không hợp lệ";
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chứng chỉ",
        data: {
          verified: false,
          error: msg
        }
      });
    }

    const cert = result[0];
    const isValid = result[1];
    const statusMessage = result[2];
    const tokenId = result[3]?.toString?.() || String(result[3]);

    // Validate that cert exists and has required properties
    if (!cert || !cert.expireDate) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay chung chi hoac du lieu khong hop le.",
        data: {
          verified: false,
          error: "Invalid certificate data from blockchain"
        }
      });
    }

    // Parse token ID for blockchain queries
    let parsedTokenId;
    try {
      if (tokenId.toString().startsWith('0x')) {
        parsedTokenId = ethers.getBigInt(tokenId);
      } else {
        parsedTokenId = ethers.getBigInt(tokenId);
      }
    } catch (e) {
      console.warn(`Failed to parse token ID: ${tokenId}`);
      parsedTokenId = tokenId;
    }

    // Check if certificate is expired by date and needs status update on-chain
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpiredByDate = Number(cert.expireDate) < currentTime;
    
    if (isExpiredByDate) {
      try {
        // Fetch actual status from blockchain struct
        const certOnChain = await contract.certificates(parsedTokenId);
        const statusOnChain = Number(certOnChain.status);
        
        // Only update if status on-chain is not Expired (2)
        if (statusOnChain !== 2) {
          console.log(`📝 Certificate ${tokenId} (code: ${verificationCode}) is expired by date but status on-chain is ${statusOnChain}, updating...`);
          const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
          const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
          const contractWithSigner = contract.connect(wallet);
          
          const tx = await contractWithSigner.updateExpiredStatus(parsedTokenId);
          const receipt = await tx.wait();
          
          // Get transaction hash from receipt (try multiple property names)
          let txHash = receipt?.transactionHash || receipt?.hash || tx?.hash;
          console.log(`✅ Receipt keys:`, Object.keys(receipt || {}));
          console.log(`✅ Transaction hash:`, txHash);
          console.log(`✅ TX hash:`, tx?.hash);
          
          if (!txHash) {
            console.warn(`⚠️ Transaction hash is null or undefined in receipt`);
            console.warn(`⚠️ Receipt object:`, receipt);
            return;
          }

          //update tx_hash vào cơ sở dữ liệu certificate_events
          const selectResult = await db.query(
            `SELECT id FROM certificate_events 
             WHERE token_id = $1 AND event_type = 'Expired' 
             ORDER BY block_number DESC LIMIT 1`,
            [tokenId]
          );
          
          console.log(`🔍 Select result:`, selectResult?.rows);
          
          if (!selectResult?.rows || selectResult.rows.length === 0) {
            console.warn(`⚠️ No expired certificate event found for token_id: ${tokenId}, creating new record...`);
            
            // Insert new record
            const insertResult = await db.query(
              `INSERT INTO certificate_events (token_id, event_type, tx_hash, created_at)
               VALUES ($1, $2, $3, NOW())
               RETURNING id`,
              [tokenId, 'Expired', txHash]
            );
            
            console.log(`✅ Created new certificate event record:`, insertResult.rows[0].id);
          } else {
            // Update existing record
            const updateResult = await db.query(
              `UPDATE certificate_events 
               SET tx_hash = $1 
               WHERE id = $2`,
              [txHash, selectResult.rows[0].id]
            );
            
            console.log(`✅ Database updated with tx_hash: ${txHash}`);
          }
        } else {
          console.log(`ℹ️ Certificate ${tokenId} (code: ${verificationCode}) already has Expired status on-chain, skipping update`);
        }
      } catch (updateError) {
        console.warn(`⚠️ Failed to update expired status on-chain: ${updateError.message}`);
        // Continue anyway - verification still succeeds even if on-chain update fails
      }
    }

    // Use the helper function to parse metadata
    const { issuerInfo, fileHash } = await parseMetadata(cert.metadataURI, 'verifyByCode');
    
    // Get revocation reason if cert is revoked
    let revocationReason = null;
    if (Number(cert.status) === 3) {
      revocationReason = await getRevocationReason(tokenId);
    }

    // Format dates
    const issueDate = new Date(Number(cert.issuedDate) * 1000).toISOString();
    const expireDate = new Date(Number(cert.expireDate) * 1000).toISOString();

    // Determine status
    let status = "unknown";
    let message = "";
    
    switch (Number(cert.status)) {
      case 0: 
        status = "Issued";
        message = isValid ? "Xác thực chứng chỉ thành công." : "Chứng chỉ đã được cấp nhưng chưa được kích hoạt.";
        break;
      case 1: 
        status = "Active";
        message = isValid ? "Xác thực chứng chỉ thành công." : "Chứng chỉ đang hoạt động.";
        break;
      case 2: 
        status = "Expired";
        message = "Chứng chỉ đã hết hạn.";
        break;
      case 3: 
        status = "Revoked";
        message = "Chứng chỉ đã bị thu hồi.";
        break;
      case 4: 
        status = "Replaced";
        message = "Chứng chỉ đã được thay thế bằng chứng chỉ mới.";
        break;
      default: 
        status = "Unknown";
        message = "Trạng thái chứng chỉ không xác định.";
    }

    const events = await getCertificateEvents(tokenId);
    const dbCert = await getCertificateFromDb(tokenId);

    const responseData = {
      success: isValid,
      message: message,
      data: {
        verified: Boolean(isValid),
        certificate: {
          token_id: tokenId,
          status: status,
          metadata_uri: cert.metadataURI,
          revocation_reason: revocationReason,
          events,
          
          issuer: issuerInfo,
          
          recipient: {
            full_name: dbCert?.recipient_name || "Chưa xác định",
            wallet_address: cert.holder,
            email_hash: "hash-email-tam-thoi"
          },
          
          certificate_detail: {
            course_name: dbCert?.course_name || (dbCert?.course_id ? dbCert.course_id.toString() : cert.courseId || "Chưa xác định"),
            certificate_name: dbCert?.certificate_name || "Chưa xác định",
            issue_date: issueDate,
            expire_date: expireDate,
            status: status
          },
          
          file_hash: fileHash,
          
          verification: {
            blockchain: "Sepolia",
            chain_id: 11155111,
            smart_contract: process.env.CONTRACT_ADDRESS,
            verified_at: new Date().toISOString()
          }
        }
      }
    };

    return res.status(200).json(responseData);
    
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({
      success: false,
      message: "Xác minh thất bại do lỗi blockchain.",
      data: {
        verified: false,
        error: err.message
      }
    });
  }
};

exports.verifyByTokenId = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { statusCode, payload } = await buildCertificateViewByTokenId(tokenId);
    return res.status(statusCode).json(payload);

  } catch (err) {
    console.error("Verify by token ID error:", err);
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
    
    // Check if it's a blockchain connection error
    if (err.code === 'NETWORK_ERROR' || 
        err.code === 'TIMEOUT' || 
        err.code === 'SERVER_ERROR' ||
        err.message?.includes('missing response') ||
        err.message?.includes('could not detect network')) {
      return res.status(503).json({
        success: false,
        message: "Không thể kết nối đến blockchain. Vui lòng thử lại sau.",
        data: {
          verified: false,
          error: "Blockchain connection error",
          hint: "RPC provider may be down or rate-limited"
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Xác minh thất bại do lỗi blockchain.",
      data: {
        verified: false,
        error: err.message
      }
    });
  }
};