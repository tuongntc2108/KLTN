const { contract } = require("../config/blockchain");
const { ethers } = require("ethers");

exports.verifyByCode = async (req, res) => {
  try {
    const { verificationCode } = req.params;
    if (!verificationCode || typeof verificationCode !== "string") {
      return res.status(400).json({ message: "verificationCode is required" });
    }

    // Call smart contract view to verify by code
    // returns (cert, isValid, statusMessage, tokenId)
    let result;
    try {
      result = await contract.verifyCertificateByCode(verificationCode);
    } catch (e) {
      const msg = e?.reason || e?.shortMessage || e?.message || "Invalid verification code";
      return res.status(404).json({ verified: false, message: msg });
    }

    const cert = result[0];
    const isValid = result[1];
    const statusMessage = result[2];
    const tokenId = result[3]?.toString?.() || String(result[3]);

    return res.json({
      verified: Boolean(isValid),
      status_message: statusMessage,
      token_id: tokenId,
      certificate: {
        metadata_uri: cert.metadataURI,
        issuer: cert.issuer,
        holder: cert.holder,
        issued_date: new Date(Number(cert.issuedDate) * 1000).toISOString(),
        expire_date: new Date(Number(cert.expireDate) * 1000).toISOString(),
        status: Number(cert.status),
        course_id: cert.courseId,
        student_id: cert.studentId,
        verification_code: cert.verificationCode,
        certificate_type: cert.certificateType,
        recipient_name: cert.recipientName,
      },
    });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.verifyByTokenId = async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    if (!tokenId) {
      return res.status(400).json({ message: "Token ID is required" });
    }

    // Validate tokenId format (should be a valid number or hex string)
    let parsedTokenId;
    try {
      // Handle both decimal and hex token IDs
      if (tokenId.startsWith('0x')) {
        parsedTokenId = ethers.getBigInt(tokenId);
      } else {
        parsedTokenId = ethers.getBigInt(tokenId);
      }
    } catch (e) {
      return res.status(400).json({ message: "Invalid Token ID format" });
    }

    // Call smart contract view to verify by token ID
    // returns (cert, isValid, statusMessage)
    let result;
    try {
      result = await contract.verifyCertificate(parsedTokenId);
    } catch (e) {
      const msg = e?.reason || e?.shortMessage || e?.message || "Token not found on blockchain";
      return res.status(404).json({ 
        verified: false, 
        message: msg 
      });
    }

    const cert = result[0];
    const isValid = result[1];
    const statusMessage = result[2];

    // Get issuer name from metadata or use address as fallback
    let issuerName = cert.issuer;
    try {
      // Try to get issuer name from metadata if available
      // This could be enhanced to fetch from IPFS or database
      if (cert.issuer && cert.issuer !== ethers.ZeroAddress) {
        // For now, use a mapping or return the address
        // You could implement a mapping of issuer addresses to names
        issuerName = cert.issuer; // This could be enhanced later
      }
    } catch (e) {
      console.warn("Could not resolve issuer name:", e);
    }

    // Format dates
    const issueDate = new Date(Number(cert.issuedDate) * 1000).toISOString().split('T')[0];
    const expireDate = new Date(Number(cert.expireDate) * 1000).toISOString().split('T')[0];

    // Determine status string
    let status = "unknown";
    switch (Number(cert.status)) {
      case 0: status = "issued"; break;
      case 1: status = "active"; break;
      case 2: status = "expired"; break;
      case 3: status = "revoked"; break;
      case 4: status = "replaced"; break;
      default: status = "unknown";
    }

    return res.json({
      verified: Boolean(isValid),
      certificate: {
        token_id: tokenId,
        status: status,
        issuer: issuerName,
        holder_wallet: cert.holder,
        metadata_uri: cert.metadataURI,
        issue_date: issueDate,
        expire_date: expireDate
      }
    });

  } catch (err) {
    console.error("Verify by token ID error:", err);
    
    // Check if it's a blockchain connection error
    if (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT') {
      return res.status(500).json({ 
        message: "Blockchain connection error" 
      });
    }
    
    res.status(500).json({ message: "Internal Server Error" });
  }
};
