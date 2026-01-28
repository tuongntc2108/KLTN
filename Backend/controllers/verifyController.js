const { contract } = require("../config/blockchain");
const { ethers } = require("ethers");
const axios = require('axios');
const db = require("../config/pg");

// Helper function to parse metadata and extract issuer and file hash info
async function parseMetadata(metadataURI, functionName = '') {
  let issuerInfo = {
    name: "Chưa xác định",
    id: "N/A",
    url: "N/A"
  };
  let fileHash = {
    sha256: "N/A",
    pdf_url: "N/A"
  };
  
  try {
    if (metadataURI && metadataURI.trim() !== '') {
      console.log(`${functionName} - Fetching metadata from:`, metadataURI);
      
      // Convert IPFS URI if needed
      let fetchUrl = metadataURI;
      if (metadataURI.startsWith('ipfs://')) {
        fetchUrl = metadataURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }
      
      const metadataResponse = await axios.get(fetchUrl, { 
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Certificate-Verifier/1.0'
        }
      });
      
      const metadata = metadataResponse.data;
      console.log(`${functionName} - Metadata received:`, JSON.stringify(metadata, null, 2));
      
      // Extract issuer info from metadata
      if (metadata.issuer) {
        console.log(`${functionName} - Found issuer in metadata:`, metadata.issuer);
        issuerInfo = {
          name: metadata.issuer.name || "Chưa xác định",
          id: metadata.issuer.id || "N/A",
          url: metadata.issuer.url || "N/A"
        };
      } else if (metadata.attributes && Array.isArray(metadata.attributes)) {
        // Fallback to attributes if issuer object not found
        const issuerAttr = metadata.attributes.find(attr => 
          attr.trait_type === 'Issuer' || attr.trait_type === 'issuer'
        );
        if (issuerAttr) {
          console.log(`${functionName} - Found issuer in attributes:`, issuerAttr.value);
          issuerInfo.name = issuerAttr.value;
        }
      }

      // Extract file hash info
      if (metadata.file_hash) {
        console.log(`${functionName} - Found file_hash in metadata:`, metadata.file_hash);
        fileHash = {
          sha256: metadata.file_hash.sha256 || "N/A",
          pdf_url: metadata.file_hash.pdf_url || "N/A"
        };
      }
      
      console.log(`${functionName} - Final issuerInfo:`, issuerInfo);
      console.log(`${functionName} - Final fileHash:`, fileHash);
    } else {
      console.log(`${functionName} - No metadata URI provided`);
    }
  } catch (error) {
    console.error(`${functionName} - Failed to fetch metadata:`, error.message);
    if (error.response) {
      console.error(`${functionName} - Response status:`, error.response.status);
      console.error(`${functionName} - Response data:`, error.response.data);
    }
    if (error.code) {
      console.error(`${functionName} - Error code:`, error.code);
    }
  }
  
  return { issuerInfo, fileHash };
}

// Helper function to get revocation reason from certificate_events
async function getRevocationReason(tokenId) {
  try {
    const result = await db.query(
      `SELECT reason FROM certificate_events 
       WHERE token_id = $1 AND event_type = 'Revoked' 
       ORDER BY block_number DESC LIMIT 1`,
      [tokenId?.toString()]
    );
    
    if (result.rows && result.rows.length > 0) {
      return result.rows[0].reason;
    }
  } catch (error) {
    console.warn('Failed to get revocation reason:', error.message);
  }
  
  return null;
}

// Helper function to get full event history from certificate_events
async function getCertificateEvents(tokenId) {
  try {
    const result = await db.query(
      `SELECT id, token_id, event_type, issuer, holder, reason, related_token, block_number, tx_hash, created_at
       FROM certificate_events
       WHERE token_id = $1
       ORDER BY created_at ASC, block_number ASC`,
      [tokenId?.toString()]
    );

    // Map to a client-friendly format
    const events = (result.rows || []).map((ev) => ({
      id: ev.id,
      token_id: ev.token_id?.toString?.() || String(ev.token_id),
      type: ev.event_type,
      issuer: ev.issuer,
      holder: ev.holder,
      reason: ev.reason || null,
      related_token: ev.related_token ? (ev.related_token?.toString?.() || String(ev.related_token)) : null,
      block_number: ev.block_number ? Number(ev.block_number) : null,
      tx_hash: ev.tx_hash,
      created_at: ev.created_at ? new Date(ev.created_at).toISOString() : null,
    }));

    return events;
  } catch (error) {
    console.warn('Failed to get certificate events:', error.message);
    return [];
  }
}

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
      result = await contract.verifyCertificateByCode(verificationCode);
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
            full_name: cert.recipientName || "Chưa xác định",
            wallet_address: cert.holder,
            email_hash: "hash-email-tam-thoi"
          },
          
          certificate_detail: {
            course_name: cert.courseId || "Chưa xác định",
            certificate_name: cert.certificateName || "Chưa xác định",
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
    
    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: "Token ID là bắt buộc",
        data: {
          verified: false
        }
      });
    }

    // Validate tokenId format
    let parsedTokenId;
    try {
      if (tokenId.startsWith('0x')) {
        parsedTokenId = ethers.getBigInt(tokenId);
      } else {
        parsedTokenId = ethers.getBigInt(tokenId);
      }
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: "Định dạng Token ID không hợp lệ",
        data: {
          verified: false
        }
      });
    }

    // Call smart contract view to verify by token ID
    let result;
    try {
      result = await contract.verifyCertificate(parsedTokenId);
    } catch (e) {
      const msg = e?.reason || e?.shortMessage || e?.message || "Không tìm thấy token trên blockchain";
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy chứng chỉ.",
        data: {
          verified: false,
          error: msg
        }
      });
    }

    const cert = result[0];
    const isValid = result[1];
    const statusMessage = result[2];

    // Use the helper function to parse metadata
    const { issuerInfo, fileHash } = await parseMetadata(cert.metadataURI, 'verifyByTokenId');
    
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
            full_name: cert.recipientName || "Chưa xác định",
            wallet_address: cert.holder,
            email_hash: "hash-email-tam-thoi"
          },
          
          certificate_detail: {
            course_name: cert.courseId || "Chưa xác định",
            certificate_name: cert.certificateName || "Chưa xác định",
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
    console.error("Verify by token ID error:", err);
    
    // Check if it's a blockchain connection error
    if (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT') {
      return res.status(500).json({
        success: false,
        message: "Xác minh thất bại do lỗi kết nối blockchain.",
        data: {
          verified: false,
          error: "Blockchain connection error"
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