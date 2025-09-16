const { contract } = require("../config/blockchain");
const { uploadMetadataToPinata } = require("../utils/pinata");
const { ethers } = require("ethers");
const db = require("../config/pg");

let certificateCounter = 1000;

exports.mintCertificate = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail || !userEmail.endsWith("@vnu.edu.vn")) {
      return res.status(401).json({ error: "Unauthorized: Gmail VNU required" });
    }

    const {
      student_id,
      course_name,
      certificate_name,
      recipient_name,
      recipient_wallet,
      issuer_name,
      issuer_id,
      issuer_url,
      issued_date,
      expire_date,
      sha256_hash,
      pdf_ipfs_hash,
    } = req.body;

    if (!student_id || !course_name || !recipient_name || !recipient_wallet) {
      return res.status(400).json({
        error: "Missing required fields",
        received: req.body,
      });
    }

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

    return res.status(201).json({
      certificate_id: certificateCounter,
      token_id: tokenId,
      metadata_uri: metadataURI,
      status: "issued_not_claimed",
    });
  } catch (err) {
    console.error("❌ Lỗi mint:", err);
    res.status(500).json({ error: "Không thể mint chứng chỉ" });
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

// ========================
// GET /api/certificates/issuer/:issuerId
// ========================
exports.getCertificatesByIssuer = async (req, res) => {
  try {
    const { issuerId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    // Build query with optional status filter
    let query = `
      SELECT 
        c.*,
        CASE 
          WHEN c.expire_date < NOW() THEN 'expired'
          ELSE c.status
        END as computed_status
      FROM certificates c 
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

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

    // Map the certificates to the expected response format
    const formattedCertificates = certificates.map(cert => {
      // Parse metadata if needed
      let parsedMetadata = {};
      try {
        // In real scenario, we might fetch metadata from IPFS
        // For now, we'll construct it from database fields
        parsedMetadata = {
          issuer: {
            name: "VNU-UET", // This should come from issuer mapping
            id: issuerId,
            url: "https://uet.vnu.edu.vn"
          },
          recipient: {
            full_name: cert.recipient_name,
            wallet_address: cert.holder,
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

    // Get issuer information (this should ideally come from a separate issuer table)
    const issuerInfo = {
      id: issuerId,
      name: "VNU-UET", // This should be looked up from issuer table
      url: "https://uet.vnu.edu.vn"
    };

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

// ========================
// PUT /api/certificates/:id/replace
// ========================
exports.replaceCertificate = async (req, res) => {
  try {
    const oldTokenId = req.params.id;
    const userEmail = req.user?.email;
    if (!userEmail || !userEmail.endsWith("@vnu.edu.vn")) {
      return res.status(401).json({ error: "Unauthorized: Gmail VNU required" });
    }

    const {
      student_id,
      course_name,
      certificate_name,
      recipient_name,
      recipient_wallet,
      issuer_name,
      issuer_id,
      issuer_url,
      issued_date,
      expire_date,
      sha256_hash,
      pdf_ipfs_hash,
    } = req.body;

    if (!student_id || !course_name || !recipient_name || !recipient_wallet) {
      return res.status(400).json({
        error: "Missing required fields",
        received: req.body,
      });
    }

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

// ========================
// POST /api/certificates/seed (Development only)
// ========================
exports.seedTestCertificates = async (req, res) => {
  try {
    const testCertificates = [
      {
        token_id: 8,
        metadata_uri: 'ipfs://QmZFTjQLSanBCLWkeBxW5wC1VhNPbGypXRfgxA8ui1jEVK',
        holder: '0x4B879e08e8Bbd2517741E9C2b9786764E7fFae9e',
        issuer: '0xIssuerAddress1',
        issued_date: new Date('2025-09-15T14:43:00.000Z'),
        expire_date: new Date('2025-09-16T00:00:00.000Z'),
        status: 'expired',
        course_id: 'Khóa học 1',
        student_id: 'STUDENT001',
        verification_code: 'VERIFY001',
        certificate_name: 'Chứng chỉ 1',
        recipient_name: 'Nguyễn Thị Cát Tường'
      },
      {
        token_id: 9,
        metadata_uri: 'ipfs://QmYwAPJzv5CZsnAzt8auV2u9wM8k7iQzQZ5Nw5vLhY3w7D',
        holder: '0x742d35Cc6634C0532925a3b8D4C9db96590b4077',
        issuer: '0xIssuerAddress1',
        issued_date: new Date('2025-09-14T10:00:00.000Z'),
        expire_date: new Date('2026-09-14T10:00:00.000Z'),
        status: 'active',
        course_id: 'Digital Marketing Professional',
        student_id: 'STUDENT002',
        verification_code: 'VERIFY002',
        certificate_name: 'Professional Certificate',
        recipient_name: 'Nguyễn Văn An'
      },
      {
        token_id: 10,
        metadata_uri: 'ipfs://QmTestHash3',
        holder: '0x8ba1f109551bD432803012645Hac136c30C6213',
        issuer: '0xIssuerAddress1',
        issued_date: new Date('2025-09-10T08:00:00.000Z'),
        expire_date: new Date('2025-12-10T08:00:00.000Z'),
        status: 'issued',
        course_id: 'English Communication Advanced',
        student_id: 'STUDENT003',
        verification_code: 'VERIFY003',
        certificate_name: 'Advanced Certificate',
        recipient_name: 'Trần Thị Bình'
      }
    ];

    // Insert test certificates
    for (const cert of testCertificates) {
      await db.pool.query(`
        INSERT INTO certificates (
          token_id, metadata_uri, holder, issuer, issued_date, expire_date, 
          status, course_id, student_id, verification_code, certificate_name, recipient_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (token_id) DO NOTHING
      `, [
        cert.token_id, cert.metadata_uri, cert.holder, cert.issuer,
        cert.issued_date, cert.expire_date, cert.status, cert.course_id,
        cert.student_id, cert.verification_code, cert.certificate_name, cert.recipient_name
      ]);
    }

    res.status(201).json({
      success: true,
      message: 'Test certificates seeded successfully',
      count: testCertificates.length
    });
  } catch (err) {
    console.error('❌ Error seeding test certificates:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to seed test certificates',
      error: err.message
    });
  }
};