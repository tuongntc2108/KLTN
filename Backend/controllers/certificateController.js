const { contract } = require("../config/blockchain");
const { uploadMetadataToPinata } = require("../utils/pinata");
const { ethers } = require("ethers");
const { syncCertificateImmediately } = require("../services/sync");
const db = require("../config/pg");

let certificateCounter = 1000;

exports.mintCertificate = async (req, res) => {
  try {
    // Only issuer (tts.tuongntc@vnpay.vn) can issue certificates
    const userEmail = req.user?.email;
    if (!userEmail || userEmail !== 'tts.tuongntc@vnpay.vn') {
      return res.status(401).json({ error: "Unauthorized: Only designated issuer can issue certificates" });
    }

    const {
      student_id,
      course_name,
      certificate_name,
      issuer_name,
      issuer_id,
      issuer_url,
      issued_date,
      expire_date,
      sha256_hash,
      pdf_ipfs_hash,
    } = req.body;

    // Only student_id is required from the issuer, other info will be auto-fetched
    if (!student_id || !course_name || !certificate_name) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["student_id", "course_name", "certificate_name"],
        received: req.body,
      });
    }

    // Auto-fetch student information based on student_id
    const studentCheck = await db.pool.query(
      'SELECT id, name, email, wallet_address FROM students WHERE id = $1',
      [student_id]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(400).json({
        error: "Không tìm thấy sinh viên",
        message: `Student với mã ${student_id} không tồn tại trong hệ thống`,
        suggestion: "Vui lòng kiểm tra lại mã sinh viên hoặc thêm sinh viên vào hệ thống trước"
      });
    }

    const student = studentCheck.rows[0];

    // Check if student has wallet address
    if (!student.wallet_address) {
      return res.status(400).json({
        error: "Student chưa kết nối ví",
        message: `Sinh viên ${student.name} (${student.email}) chưa kết nối địa chỉ ví blockchain`,
        suggestion: "Sinh viên cần đăng nhập và kết nối ví trước khi có thể nhận chứng chỉ"
      });
    }

    // Auto-fill recipient information from database
    const recipient_name = student.name;
    const recipient_email = student.email;
    const recipient_wallet = student.wallet_address;

    // Generate tokenId giả lập từ counter
    certificateCounter++;
    const tokenIdStr = certificateCounter.toString();

    // Build metadata JSON
    const metadata = {
      name: `${certificate_name} - ${recipient_name}`,
      description: `${certificate_name} do ${issuer_name} cấp cho học viên ${recipient_name}.`,
      image: "ipfs://QmHashOfImageFile", // TODO
      external_url: `https://certify.example.org/certificate/${tokenIdStr}`,
      attributes: [
        { trait_type: "Issuer", value: issuer_name },
        { trait_type: "Recipient", value: recipient_name },
        { trait_type: "Course Name", value: course_name },
        { trait_type: "Certificate Name", value: certificate_name },
        { trait_type: "Issued Date", value: issued_date },
        { trait_type: "Expire Date", value: expire_date },
        { trait_type: "Status", value: "active" },
        { trait_type: "Token ID", value: tokenIdStr },
        { trait_type: "Blockchain", value: "Sepolia" },
        { trait_type: "Smart Contract", value: process.env.CONTRACT_ADDRESS },
      ],
      issuer: {
        name: issuer_name,
        id: issuer_id,
        url: issuer_url,
      },
      recipient: {
        full_name: recipient_name,
        wallet_address: recipient_wallet,
        email_hash: "hash-email-tam-thoi",
      },
      certificate: {
        course_name: course_name,
        certificate_name: certificate_name,
        issued_date: new Date(issued_date).toISOString(),
        expire_date: new Date(expire_date).toISOString(),
        status: "active",
      },
      file_hash: {
        sha256: sha256_hash,
        pdf_url: `ipfs://${pdf_ipfs_hash}`,
      },
      verification: {
        token_id: tokenIdStr,
        smart_contract: process.env.CONTRACT_ADDRESS,
        blockchain: "Sepolia",
        chain_id: 11155111,
      },
    };

    // Upload metadata lên Pinata
    const metadataURI = await uploadMetadataToPinata(metadata);

    // Gọi smart contract
    const expireUnix = Math.floor(new Date(expire_date).getTime() / 1000);
    const verificationCode = sha256_hash.slice(0, 16) + Date.now();

    // Sử dụng gas options để tránh lỗi replacement transaction underpriced
    const gasOptions = {
      gasLimit: 500000,
      gasPrice: ethers.parseUnits("25", "gwei") // 25 gwei
    };

    const tx = await contract.issueCertificate(
      recipient_wallet,
      metadataURI,
      expireUnix,
      course_name,
      student_id.toString(),
      verificationCode,
      certificate_name,
      recipient_name,
      gasOptions
    );

    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((e) => e && e.name === "CertificateIssued")[0];

    const tokenId = event?.args?.tokenId.toString() || tokenIdStr;

    // Immediately sync the certificate to database
    try {
      console.log(`🔄 Starting immediate sync for certificate ${tokenId}...`);
      await syncCertificateImmediately(tokenId);
      console.log(`✅ Certificate ${tokenId} synced to database immediately`);
      
      // Verify the sync worked by checking the database
      const verifyQuery = await db.pool.query(
        'SELECT token_id, status, recipient_name, course_id FROM certificates WHERE token_id = $1',
        [tokenId]
      );
      
      if (verifyQuery.rows.length > 0) {
        console.log(`✅ Certificate ${tokenId} confirmed in database:`, verifyQuery.rows[0]);
      } else {
        console.warn(`⚠️ Certificate ${tokenId} not found in database after sync`);
      }
    } catch (syncError) {
      console.error(`❌ Failed to sync certificate ${tokenId} immediately:`, syncError.message);
      // Don't fail the whole operation if sync fails, but log more details
      console.error('Sync error details:', syncError);
    }

    return res.status(201).json({
      success: true,
      certificate_id: certificateCounter,
      token_id: tokenId,
      metadata_uri: metadataURI,
      status: "issued_not_claimed",
      transaction_hash: receipt.transactionHash,
    });
  } catch (err) {
    console.error("❌ Lỗi mint:", err);
    res.status(500).json({ error: "Không thể mint chứng chỉ" });
  }
};

// ========================
// GET /api/certificates/my - Get certificates for current authenticated user
// ========================
exports.getMyCertificates = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    console.log(`🔍 Debug getMyCertificates - Raw user object:`, req.user);
    console.log(`🔍 Debug getMyCertificates - User email: ${userEmail}`);
    
    if (!userEmail) {
      console.log(`❌ Debug getMyCertificates - No user email found`);
      return res.status(401).json({ error: "Unauthorized: User not authenticated" });
    }

    // Get student info based on authenticated user's email
    const studentQuery = await db.pool.query(
      'SELECT id, email, wallet_address, name FROM students WHERE email = $1',
      [userEmail.toLowerCase()]
    );

    console.log(`🔍 Debug getMyCertificates - Student query for email: ${userEmail.toLowerCase()}`);
    console.log(`🔍 Debug getMyCertificates - Student query result:`, studentQuery.rows);

    if (studentQuery.rows.length === 0) {
      console.log(`❌ Debug getMyCertificates - No student found for email: ${userEmail}`);
      return res.status(200).json({
        success: true,
        message: "No student record found. Please connect your wallet first.",
        certificates: []
      });
    }

    const student = studentQuery.rows[0];
    console.log(`🔍 Debug getMyCertificates - Found student:`, student);
    
    // If student doesn't have a wallet address, return empty certificates
    if (!student.wallet_address) {
      console.log(`❌ Debug getMyCertificates - Student has no wallet address`);
      return res.status(200).json({
        success: true,
        message: "Please connect your wallet to view certificates.",
        certificates: []
      });
    }

    // Get certificates for this student's wallet address
    // Only include certificates where this student is the holder
    // Use LOWER() for case-insensitive wallet address comparison
    const query = `
      SELECT 
        c.*,
        CASE 
          WHEN c.expire_date < NOW() THEN 'expired'
          WHEN c.status = 'Issued' THEN 'pending'
          WHEN c.status = 'Active' THEN 'active'
          WHEN c.status = 'Revoked' THEN 'revoked'
          WHEN c.status = 'Replaced' THEN 'replaced'
          ELSE LOWER(c.status)
        END as computed_status
      FROM certificates c 
      WHERE LOWER(c.holder) = LOWER($1)
      ORDER BY c.created_at DESC
    `;
    
    const result = await db.pool.query(query, [student.wallet_address]);
    const certificates = result.rows;

    console.log(`🔍 Debug getMyCertificates - Certificates query for wallet ${student.wallet_address}:`, certificates.length, "certificates found");
    console.log(`🔍 Debug getMyCertificates - Sample certificates:`, certificates.slice(0, 2));

    // Format certificates for frontend
    const formattedCertificates = certificates.map(cert => {
      // Map status for display
      let displayStatus = cert.computed_status;
      if (cert.computed_status === 'issued_not_claimed' || cert.computed_status === 'issued' || cert.computed_status === 'pending') {
        displayStatus = 'pending';
      } else if (cert.computed_status === 'active') {
        displayStatus = 'active';
      } else if (cert.computed_status === 'expired') {
        displayStatus = 'expired';
      } else if (cert.computed_status === 'revoked') {
        displayStatus = 'revoked';
      }

      return {
        id: cert.id,
        name: cert.certificate_name || "Chứng chỉ",
        issuer: "VNU-UET", // Default issuer
        issueDate: new Date(cert.issued_date).toLocaleDateString('vi-VN'),
        expiryDate: new Date(cert.expire_date).toLocaleDateString('vi-VN'),
        status: displayStatus,
        tokenId: cert.token_id,
        description: `Chứng nhận hoàn thành khóa học ${cert.course_id || 'N/A'}`,
        course: cert.course_id || "N/A",
        grade: "Đạt", // Default grade since we don't have grade in DB
        recipient_name: cert.recipient_name,
        metadata_uri: cert.metadata_uri
      };
    });

    return res.status(200).json({
      success: true,
      message: "Danh sách chứng chỉ của học viên.",
      student: {
        name: student.name,
        email: student.email,
        wallet_address: student.wallet_address
      },
      certificates: formattedCertificates
    });

  } catch (err) {
    console.error("❌ Lỗi getMyCertificates:", err);
    res.status(500).json({ 
      success: false,
      message: "Không thể lấy danh sách chứng chỉ",
      error: err.message 
    });
  }
};

// ========================
// GET /api/certificates/:id
// ========================
exports.getCertificateById = async (req, res) => {
  try {
    const tokenId = req.params.id;

    const cert = await contract.certificates(tokenId);
    if (!cert || cert.holder === ethers.ZeroAddress) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    // Map enum status
    const statusMap = {
      0: "Issued",
      1: "Active",
      2: "Expired",
      3: "Revoked",
      4: "Replaced",
    };

    const response = {
      certificate_id: Number(tokenId),
      token_id: tokenId,
      metadata_uri: cert.metadataURI,
      status: statusMap[Number(cert.status)] || "Unknown",
      issued_date: new Date(Number(cert.issuedDate) * 1000)
        .toISOString()
        .split("T")[0],
      expire_date: new Date(Number(cert.expireDate) * 1000)
        .toISOString()
        .split("T")[0],
      holder: {
        name: cert.recipientName,
        wallet_address: cert.holder,
      },
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error("❌ Lỗi getCertificateById:", err);
    res.status(500).json({ error: "Không thể lấy chứng chỉ" });
  }
};

// ========================
// PUT /api/certificates/:id/revoke
// ========================
exports.revokeCertificate = async (req, res) => {
  try {
    const tokenId = req.params.id;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ error: "Revoke reason is required" });
    }

    // Gọi smart contract để thu hồi
    const tx = await contract.revokeCertificate(tokenId, reason);
    const receipt = await tx.wait();

    return res.status(200).json({
      message: "Certificate revoked",
      status: "revoked",
      transactionHash: receipt.transactionHash,
    });
  } catch (err) {
    console.error("❌ Lỗi revokeCertificate:", err);

    // Xử lý lỗi cụ thể
    if (err.error?.message?.includes("Not the issuer")) {
      return res.status(401).json({ error: "Unauthorized: Not the issuer" });
    }
    if (err.error?.message?.includes("Certificate cannot be revoked")) {
      return res.status(400).json({ error: "Certificate cannot be revoked" });
    }

    return res.status(500).json({ error: "Không thể revoke chứng chỉ", details: err.message });
  }
};

/*
// Đây là API lấy danh sách 10 chứng chỉ của 1 issuer, để cho version sau, version đầu tiên chỉ có 1 issuer duy nhất nên sẽ lấy toàn bộ chứng chỉ toàn hệ thống
// ========================
// GET /api/certificates/issuer/:issuerId
// ========================
exports.getCertificatesByIssuer = async (req, res) => {
  try {
    const { issuerId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    // Map issuer ID to wallet address
    const issuerMapping = {
      'VNU-UET-001': '0x4B879e08e8Bbd2517741E9C2b9786764E7fFae9e'
      // Add more issuer mappings as needed
    };

    const issuerWalletAddress = issuerMapping[issuerId];
    if (!issuerWalletAddress) {
      return res.status(404).json({
        success: false,
        message: `Issuer ${issuerId} not found`
      });
    }

    // Build query with issuer filter
    let query = `
      SELECT 
        c.*,
        CASE 
          WHEN c.expire_date < NOW() THEN 'expired'
          ELSE c.status
        END as computed_status
      FROM certificates c 
      WHERE c.issuer = $1
    `;
    const params = [issuerWalletAddress];
    let paramCount = 1;

    // Add status filter if provided
    if (status) {
      paramCount++;
      if (status === 'expired') {
        query += ` AND c.expire_date < NOW()`;
      } else {
        query += ` AND c.status = $${paramCount}`;
        params.push(status);
      }
    }

    // Add ordering and pagination
    query += ` ORDER BY c.created_at DESC`;
    
    // Add limit
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    // Add offset
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.pool.query(query, params);
    const certificates = result.rows;

    // Get issuer information from the mapping (moved before formattedCertificates)
    const issuerInfoMapping = {
      'VNU-UET-001': {
        id: 'VNU-UET-001',
        name: 'VNU-UET',
        url: 'https://uet.vnu.edu.vn'
      }
      // Add more issuer information as needed
    };

    const issuerInfo = issuerInfoMapping[issuerId] || {
      id: issuerId,
      name: "Unknown Issuer",
      url: "N/A"
    };

    // Map the certificates to the expected response format
    const formattedCertificates = certificates.map(cert => {
      // Parse metadata if needed
      let parsedMetadata = {
        issuer: {
          name: issuerInfo.name,
          id: issuerInfo.id,
          url: issuerInfo.url
        },
        recipient: {
          full_name: cert.recipient_name || "Unknown",
          wallet_address: cert.holder || "",
          email_hash: "hash-email-tam-thoi"
        },
        certificate: {
          course_name: cert.course_id || "N/A",
          certificate_name: cert.certificate_name || "N/A",
          issued_date: cert.issued_date,
          expire_date: cert.expire_date,
          status: cert.computed_status
        },
        verification: {
          blockchain: "Sepolia",
          chain_id: 11155111,
          smart_contract: process.env.CONTRACT_ADDRESS,
          verified_at: new Date().toISOString()
        }
      };
      try {
        // In real scenario, we might fetch metadata from IPFS
        // For now, we'll construct it from database fields
        // Additional metadata processing can go here if needed
      } catch (e) {
        console.warn("Could not parse metadata for certificate", cert.id);
      }

      return {
        verified: true, // Assuming all certificates in DB are verified
        certificate: {
          token_id: cert.token_id.toString(),
          status: cert.computed_status,
          metadata_uri: cert.metadata_uri,
          issuer: parsedMetadata.issuer,
          recipient: parsedMetadata.recipient,
          certificate_detail: parsedMetadata.certificate,
          file_hash: {
            sha256: "8f2a559490fba9b65c9f8e60a63e4cc5db1adbd918f6b2f7d5e0340d5f37a16c", // Mock hash
            pdf_url: "ipfs://QmYwAPJzv5CZsnAzt8auV2u9wM8k7iQzQZ5Nw5vLhY3w7D" // Mock IPFS
          },
          verification: parsedMetadata.verification
        }
      };
    });

    return res.status(200).json({
      success: true,
      message: "Danh sách chứng chỉ của đơn vị đào tạo.",
      issuer: issuerInfo,
      certificates: formattedCertificates
    });

  } catch (err) {
    console.error("❌ Lỗi getCertificatesByIssuer:", err);
    res.status(500).json({ 
      success: false,
      message: "Không thể lấy danh sách chứng chỉ",
      error: err.message 
    });
  }
};
*/

// ========================
// GET /api/certificates/all - Get all certificates in the system
// ========================
exports.getAllCertificates = async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;

    // Build query to get all certificates
    let query = `
      SELECT 
        c.*,
        CASE 
          WHEN c.expire_date < NOW() THEN 'expired'
          ELSE c.status
        END as computed_status
      FROM certificates c 
    `;
    const params = [];
    let paramCount = 0;

    // Add status filter if provided
    if (status) {
      paramCount++;
      if (status === 'expired') {
        query += ` WHERE c.expire_date < NOW()`;
      } else {
        query += ` WHERE c.status = $${paramCount}`;
        params.push(status);
      }
    }

    // Add ordering and pagination
    query += ` ORDER BY c.created_at DESC`;
    
    // Add limit
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    // Add offset
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.pool.query(query, params);
    const certificates = result.rows;

    // Map the certificates to the expected response format
    const formattedCertificates = certificates.map(cert => {
      // Get issuer information based on issuer wallet address
      const issuerInfo = {
        id: 'VNU-UET-001', // Default issuer ID
        name: 'VNU-UET',
        url: 'https://uet.vnu.edu.vn'
      };

      // Parse metadata if needed
      let parsedMetadata = {
        issuer: issuerInfo,
        recipient: {
          full_name: cert.recipient_name || "Unknown",
          wallet_address: cert.holder || "",
          email_hash: "hash-email-tam-thoi"
        },
        certificate: {
          course_name: cert.course_id || "N/A",
          certificate_name: cert.certificate_name || "N/A",
          issued_date: cert.issued_date,
          expire_date: cert.expire_date,
          status: cert.computed_status
        },
        verification: {
          blockchain: "Sepolia",
          chain_id: 11155111,
          smart_contract: process.env.CONTRACT_ADDRESS,
          verified_at: new Date().toISOString()
        }
      };

      return {
        verified: true, // Assuming all certificates in DB are verified
        certificate: {
          token_id: cert.token_id.toString(),
          status: cert.computed_status,
          metadata_uri: cert.metadata_uri,
          issuer: parsedMetadata.issuer,
          recipient: parsedMetadata.recipient,
          certificate_detail: parsedMetadata.certificate,
          file_hash: {
            sha256: "8f2a559490fba9b65c9f8e60a63e4cc5db1adbd918f6b2f7d5e0340d5f37a16c", // Mock hash
            pdf_url: "ipfs://QmYwAPJzv5CZsnAzt8auV2u9wM8k7iQzQZ5Nw5vLhY3w7D" // Mock IPFS
          },
          verification: parsedMetadata.verification
        }
      };
    });

    return res.status(200).json({
      success: true,
      message: "Danh sách tất cả chứng chỉ trong hệ thống.",
      total: certificates.length,
      certificates: formattedCertificates
    });

  } catch (err) {
    console.error("❌ Lỗi getAllCertificates:", err);
    res.status(500).json({ 
      success: false,
      message: "Không thể lấy danh sách chứng chỉ",
      error: err.message 
    });
  }
};
exports.replaceCertificate = async (req, res) => {
  try {
    const oldTokenId = req.params.id;
    // Only issuer (tts.tuongntc@vnpay.vn) can replace certificates
    const userEmail = req.user?.email;
    if (!userEmail || userEmail !== 'tts.tuongntc@vnpay.vn') {
      return res.status(401).json({ error: "Unauthorized: Only designated issuer can replace certificates" });
    }

    const {
      student_id,
      course_name,
      certificate_name,
      issuer_name,
      issuer_id,
      issuer_url,
      issued_date,
      expire_date,
      sha256_hash,
      pdf_ipfs_hash,
    } = req.body;

    // Only student_id is required from the issuer, other info will be auto-fetched
    if (!student_id || !course_name || !certificate_name) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["student_id", "course_name", "certificate_name"],
        received: req.body,
      });
    }

    // Auto-fetch student information based on student_id
    const studentCheck = await db.pool.query(
      'SELECT id, name, email, wallet_address FROM students WHERE id = $1',
      [student_id]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(400).json({
        error: "Không tìm thấy sinh viên",
        message: `Student với mã ${student_id} không tồn tại trong hệ thống`,
        suggestion: "Vui lòng kiểm tra lại mã sinh viên hoặc thêm sinh viên vào hệ thống trước"
      });
    }

    const student = studentCheck.rows[0];

    // Check if student has wallet address
    if (!student.wallet_address) {
      return res.status(400).json({
        error: "Student chưa kết nối ví",
        message: `Sinh viên ${student.name} (${student.email}) chưa kết nối địa chỉ ví blockchain`,
        suggestion: "Sinh viên cần đăng nhập và kết nối ví trước khi có thể nhận chứng chỉ"
      });
    }

    // Auto-fill recipient information from database
    const recipient_name = student.name;
    const recipient_email = student.email;
    const recipient_wallet = student.wallet_address;

    // Build metadata JSON for new certificate
    const metadata = {
      name: `${certificate_name} - ${recipient_name}`,
      description: `${certificate_name} do ${issuer_name} cấp cho học viên ${recipient_name}.`,
      image: "ipfs://QmHashOfImageFile", // TODO
      external_url: `https://certify.example.org/certificate/NEW`,
      attributes: [
        { trait_type: "Issuer", value: issuer_name },
        { trait_type: "Recipient", value: recipient_name },
        { trait_type: "Course Name", value: course_name },
        { trait_type: "Certificate Name", value: certificate_name },
        { trait_type: "Issued Date", value: issued_date },
        { trait_type: "Expire Date", value: expire_date },
        { trait_type: "Status", value: "active" },
        { trait_type: "Blockchain", value: "Sepolia" },
        { trait_type: "Smart Contract", value: process.env.CONTRACT_ADDRESS },
      ],
      issuer: {
        name: issuer_name,
        id: issuer_id,
        url: issuer_url,
      },
      recipient: {
        full_name: recipient_name,
        wallet_address: recipient_wallet,
        email_hash: "hash-email-tam-thoi",
      },
      certificate: {
        course_name: course_name,
        certificate_name: certificate_name,
        issued_date: new Date(issued_date).toISOString(),
        expire_date: new Date(expire_date).toISOString(),
        status: "active",
      },
      file_hash: {
        sha256: sha256_hash,
        pdf_url: `ipfs://${pdf_ipfs_hash}`,
      },
      verification: {
        smart_contract: process.env.CONTRACT_ADDRESS,
        blockchain: "Sepolia",
        chain_id: 11155111,
      },
    };

    // Upload metadata lên Pinata
    const metadataURI = await uploadMetadataToPinata(metadata);

    // Gọi smart contract để thay thế
    const expireUnix = Math.floor(new Date(expire_date).getTime() / 1000);
    const verificationCode = sha256_hash.slice(0, 16) + Date.now();

    // Sử dụng gas options để tránh lỗi replacement transaction underpriced
    const gasOptions = {
      gasLimit: 500000,
      gasPrice: ethers.parseUnits("25", "gwei") // 25 gwei
    };

    const tx = await contract.replaceCertificate(
      oldTokenId,
      recipient_wallet,
      metadataURI,
      expireUnix,
      course_name,
      student_id.toString(),
      verificationCode,
      certificate_name,
      recipient_name,
      gasOptions
    );

    const receipt = await tx.wait();
    
    // Tìm event CertificateReplaced để lấy newTokenId
    const replacedEvent = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((e) => e && e.name === "CertificateReplaced")[0];

    const newTokenId = replacedEvent?.args?.newTokenId?.toString();

    return res.status(200).json({
      new_certificate_id: newTokenId || "unknown",
      replaced_old_cert_id: oldTokenId,
    });
  } catch (err) {
    console.error("❌ Lỗi replaceCertificate:", err);
    
    // Xử lý lỗi cụ thể
    if (err.error?.message?.includes("Not the issuer")) {
      return res.status(401).json({ error: "Unauthorized: Not the issuer" });
    }
    if (err.error?.message?.includes("Certificate does not exist")) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    return res.status(500).json({ error: "Không thể thay thế chứng chỉ", details: err.message });
  }
};

