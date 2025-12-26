const { contract } = require("../config/blockchain");
const { uploadMetadataToPinata } = require("../utils/pinata");
const { ethers } = require("ethers");
const { syncCertificateImmediately } = require("../services/sync");
const db = require("../config/pg");
const aiSummaryService = require("../services/aiSummaryService");

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
      course_name, // Keep for backward compatibility
      course_id,   // New field for course selection
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
    if (!student_id || !certificate_name) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["student_id", "certificate_name"],
        received: req.body,
      });
    }

    // Handle course information - use course_id if provided, otherwise course_name, or allow empty
    let finalCourseName = course_name || "";
    let finalCourseId = course_id;
    
    if (course_id) {
      // Fetch course information from database
      const courseQuery = await db.pool.query(
        'SELECT id, course_name FROM courses WHERE id = $1',
        [course_id]
      );
      
      if (courseQuery.rows.length === 0) {
        return res.status(400).json({
          error: "Không tìm thấy khóa học",
          message: `Course với ID ${course_id} không tồn tại trong hệ thống`
        });
      }
      
      finalCourseName = courseQuery.rows[0].course_name;
      finalCourseId = courseQuery.rows[0].id;
    } else if (course_name) {
      //Trước đây hệ thống dùng course_name để định danh khóa học, để an toàn thì vẫn giữ lại đoạn mã này
      // For backward compatibility, keep the course_name approach
      finalCourseName = course_name;
    }
    // If neither course_id nor course_name is provided, finalCourseName will default to "Chứng chỉ độc lập"

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

    // Generate tokenId giả lập từ counter để phục vụ external_url và metadata trước khi mint
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
        { trait_type: "Course Name", value: finalCourseName },
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
        course_name: finalCourseName,
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
      finalCourseId ? finalCourseId.toString() : finalCourseName, // Use course_id if available, otherwise course_name
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
        'SELECT token_id, status, recipient_name, course_name FROM certificates WHERE token_id = $1',
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
          WHEN c.status = 'Revoked' THEN 'revoked'
          WHEN c.status = 'Replaced' THEN 'replaced'
          WHEN c.expire_date < NOW() THEN 'expired'
          WHEN c.status = 'Issued' THEN 'pending'
          WHEN c.status = 'Active' THEN 'active'
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
      // Use computed_status directly (already calculated in SQL query)
      // No need for additional mapping as SQL query handles all cases correctly
      const displayStatus = cert.computed_status;

      return {
        id: cert.id,
        name: cert.certificate_name || "Chứng chỉ",
        issuer: "VNU-UET", // Default issuer
        issueDate: new Date(cert.issued_date).toLocaleDateString('vi-VN'),
        expiryDate: new Date(cert.expire_date).toLocaleDateString('vi-VN'),
        status: displayStatus,
        tokenId: cert.token_id,
        description: `Chứng nhận hoàn thành khóa học ${cert.course_name || 'N/A'}`,
        course: cert.course_name || "N/A",
        grade: "Đạt", // Default grade 
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
// POST /api/certificates/:id/claim - Claim a certificate
// ========================
exports.claimCertificate = async (req, res) => {
  try {
    const tokenId = req.params.id;
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).json({ 
        success: false,
        error: "Authentication required" 
      });
    }

    // Get student info based on authenticated user's email
    const studentQuery = await db.pool.query(
      'SELECT id, email, wallet_address, name FROM students WHERE email = $1',
      [userEmail.toLowerCase()]
    );

    if (studentQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Student not found",
        message: "Please register as a student first"
      });
    }

    const student = studentQuery.rows[0];
    
    // Check if student has a wallet address
    if (!student.wallet_address) {
      return res.status(400).json({
        success: false,
        error: "Wallet not connected",
        message: "Please connect your wallet before claiming certificates"
      });
    }

    // Check if certificate exists and belongs to this student
    const certQuery = await db.pool.query(
      'SELECT * FROM certificates WHERE token_id = $1 AND LOWER(holder) = LOWER($2)',
      [tokenId, student.wallet_address]
    );

    if (certQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Certificate not found",
        message: "Certificate not found or not assigned to your wallet"
      });
    }

    const certificate = certQuery.rows[0];
    
    // Check if certificate is in claimable status
    //pending là trạng thái tương đương issued chưa claim, Là computed_status được map từ 'Issued' khi trả về API. check 'pending' để handle trường hợp frontend gửi computed status (vì frontend thấy là 'pending'). Thực tế check pending là không cần thiết nhưng để an toàn nên giữ lại
    if (certificate.status.toLowerCase() !== 'issued' && certificate.status.toLowerCase() !== 'pending') { 
      return res.status(400).json({
        success: false,
        error: "Certificate not claimable",
        message: `Certificate is in ${certificate.status} status and cannot be claimed`
      });
    }

    // Call smart contract to claim the certificate
    const gasOptions = {
      gasLimit: 300000,
      gasPrice: ethers.parseUnits("25", "gwei")
    };

    console.log(`🔄 Claiming certificate ${tokenId} for wallet ${student.wallet_address}...`);
    const tx = await contract.claimCertificate(tokenId, gasOptions);
    const receipt = await tx.wait();

    console.log(`✅ Certificate ${tokenId} claimed successfully. Transaction: ${receipt.transactionHash}`);

    // Update the certificate status in database
    await db.pool.query(
      'UPDATE certificates SET status = $1, updated_at = NOW() WHERE token_id = $2',
      ['Active', tokenId]
    );

    // Immediately sync the certificate to ensure status is updated
    try {
      await syncCertificateImmediately(tokenId);
      console.log(`✅ Certificate ${tokenId} synced after claiming`);
    } catch (syncError) {
      console.error(`❌ Failed to sync certificate ${tokenId} after claiming:`, syncError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Certificate claimed successfully",
      data: {
        token_id: tokenId,
        status: "Active",
        transaction_hash: receipt.transactionHash,
        claimed_at: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error("❌ Error claiming certificate:", err);
    
    // Handle specific blockchain errors
    if (err.message?.includes("Certificate already claimed")) {
      return res.status(400).json({
        success: false,
        error: "Certificate already claimed",
        message: "This certificate has already been claimed"
      });
    }
    
    if (err.message?.includes("Not authorized")) {
      return res.status(403).json({
        success: false,
        error: "Not authorized",
        message: "You are not authorized to claim this certificate"
      });
    }

    return res.status(500).json({ 
      success: false,
      error: "Failed to claim certificate",
      message: "An error occurred while claiming the certificate",
      details: err.message
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
// POST /api/certificates/:id/sync-status - Sync certificate status after blockchain claim
// ======================== 
// hàm này để hỗ trợ frontend claim trực tiếp qua metamask, sau khi claim xong frontend gọi API này để backend cập nhật trạng thái chứng chỉ, hiện tại chưa cần thiết
/** 
exports.syncCertificateStatus = async (req, res) => {
  try {
    const tokenId = req.params.id;
    const { transactionHash, blockNumber } = req.body;
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).json({ 
        success: false,
        error: "Authentication required" 
      });
    }

    // Get student info
    const studentQuery = await db.pool.query(
      'SELECT id, email, wallet_address, name FROM students WHERE email = $1',
      [userEmail.toLowerCase()]
    );

    if (studentQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Student not found"
      });
    }

    const student = studentQuery.rows[0];

    // Verify the certificate belongs to this student
    const certQuery = await db.pool.query(
      'SELECT * FROM certificates WHERE token_id = $1 AND LOWER(holder) = LOWER($2)',
      [tokenId, student.wallet_address]
    );

    if (certQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Certificate not found or not assigned to your wallet"
      });
    }

    const certificate = certQuery.rows[0];

    // Update certificate status to Active
    await db.pool.query(
      'UPDATE certificates SET status = $1, updated_at = NOW() WHERE token_id = $2',
      ['Active', tokenId]
    );

    // Log the claim event
    await db.pool.query(
      `INSERT INTO certificate_events (token_id, event_type, holder, block_number, tx_hash) 
       VALUES ($1, $2, $3, $4, $5)`,
      [tokenId, 'Claimed', student.wallet_address, blockNumber || null, transactionHash]
    );

    console.log(`✅ Certificate ${tokenId} status synced to Active after blockchain claim`);

    return res.status(200).json({
      success: true,
      message: "Certificate status synced successfully",
      data: {
        token_id: tokenId,
        status: "Active",
        transaction_hash: transactionHash,
        synced_at: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error("❌ Error syncing certificate status:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to sync certificate status",
      message: "An error occurred while syncing the certificate status",
      details: err.message
    });
  }
};
*/

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
          email_hash: "hash-email-tam-thoi",
          student_id: cert.student_id || ""
        },
        certificate: {
          course_name: cert.course_name || "N/A",
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
          WHEN c.status = 'Revoked' THEN 'revoked'
          WHEN c.status = 'Replaced' THEN 'replaced'
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
        query += ` WHERE c.expire_date < NOW() AND c.status != 'Revoked' AND c.status != 'Replaced'`;
      } else if (status === 'revoked') {
        query += ` WHERE c.status = 'Revoked'`;
      } else if (status === 'replaced') {
        query += ` WHERE c.status = 'Replaced'`;
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
          email_hash: "hash-email-tam-thoi",
          student_id: cert.student_id || ""
        },
        certificate: {
          course_name: cert.course_name || "N/A",
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
      course_name, // Keep for backward compatibility
      course_id,   // New field for course selection
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
    if (!student_id || !certificate_name) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["student_id", "certificate_name"],
        received: req.body,
      });
    }

    // Handle course information - use course_id if provided, otherwise course_name, or allow empty
    let finalCourseName = course_name || "Chứng chỉ độc lập";
    let finalCourseId = course_id;
    
    if (course_id) {
      // Fetch course information from database
      const courseQuery = await db.pool.query(
        'SELECT id, course_name FROM courses WHERE id = $1',
        [course_id]
      );
      
      if (courseQuery.rows.length === 0) {
        return res.status(400).json({
          error: "Không tìm thấy khóa học",
          message: `Course với ID ${course_id} không tồn tại trong hệ thống`
        });
      }
      
      finalCourseName = courseQuery.rows[0].course_name;
      finalCourseId = courseQuery.rows[0].id;
    } else if (course_name) {
      // For backward compatibility, keep the course_name approach
      finalCourseName = course_name;
    }
    // If neither course_id nor course_name is provided, finalCourseName will default to "Chứng chỉ độc lập"

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

    // Generate tokenId giả lập từ counter để phục vụ external_url và metadata trước khi mint
    certificateCounter++;
    const tokenIdStr = certificateCounter.toString();

    // Build metadata JSON for new certificate
    const metadata = {
      name: `${certificate_name} - ${recipient_name}`,
      description: `${certificate_name} do ${issuer_name} cấp cho học viên ${recipient_name}.`,
      image: "ipfs://QmHashOfImageFile", // TODO
      external_url: `https://certify.example.org/certificate/${tokenIdStr}`,
      attributes: [
        { trait_type: "Issuer", value: issuer_name },
        { trait_type: "Recipient", value: recipient_name },
        { trait_type: "Course Name", value: finalCourseName },
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
        course_name: finalCourseName,
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
      finalCourseId ? finalCourseId.toString() : finalCourseName, // Use course_id if available, otherwise course_name
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

// ========================
// GET /api/certificates/:id/ai-summary - Get AI summary for certificate
// ========================
exports.getAISummary = async (req, res) => {
  try {
    const tokenId = req.params.id;

    // Get certificate information from database
    const certificateQuery = await db.pool.query(
      `SELECT c.*, 
       COALESCE(co.course_name, c.course_name) as final_course_name,
       co.duration, 
       co.course_description, 
       co.training_content
       FROM certificates c
       LEFT JOIN courses co ON c.course_id = co.id
       WHERE c.token_id = $1`,
      [tokenId]
    );

    if (certificateQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Certificate not found"
      });
    }

    const certificate = certificateQuery.rows[0];

    console.log('🔍 Certificate data for AI summary:', {
      tokenId,
      course_name: certificate.course_name,
      final_course_name: certificate.final_course_name,
      course_id: certificate.course_id,
      certificate_name: certificate.certificate_name
    });

    // Check if we have course information (either from join or certificate table)
    const courseName = certificate.final_course_name || certificate.course_name;
    
    if (!courseName || courseName.trim() === '') {
      return res.status(200).json({
        success: true,
        ai_summary: "Chứng chỉ này chưa được liên kết với khóa học cụ thể. Đây có thể là chứng chỉ độc lập hoặc chứng chỉ đặc biệt do tổ chức cấp phát."
      });
    }

    // If AI summary already exists in database, return it
    if (certificate.ai_summary) {
      return res.status(200).json({
        success: true,
        ai_summary: certificate.ai_summary
      });
    }

    // Generate AI summary using Gemini
    try {
      const courseData = {
        course_name: courseName,
        duration: certificate.duration || 'Không có thông tin',
        course_description: certificate.course_description || 'Không có mô tả',
        training_content: certificate.training_content || 'Không có thông tin chi tiết'
      };

      console.log('🤖 Generating AI summary with data:', courseData);

      const aiSummary = await aiSummaryService.generateCertificateSummary(courseData);

      // Save AI summary to database
      await db.pool.query(
        'UPDATE certificates SET ai_summary = $1 WHERE token_id = $2',
        [aiSummary, tokenId]
      );

      return res.status(200).json({
        success: true,
        ai_summary: aiSummary
      });

    } catch (aiError) {
      console.error('Error generating AI summary:', aiError);
      return res.status(500).json({
        success: false,
        error: "Không thể tạo tóm tắt AI",
        details: aiError.message
      });
    }

  } catch (error) {
    console.error('Error in getAISummary:', error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
};

