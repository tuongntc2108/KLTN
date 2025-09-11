const { contract } = require("../config/blockchain");
const { uploadMetadataToPinata } = require("../utils/pinata");
const { ethers } = require("ethers");

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
      certificate_type,
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
      name: `${certificate_type} - ${recipient_name}`,
      description: `${certificate_type} do ${issuer_name} cấp cho học viên ${recipient_name}.`,
      image: "ipfs://QmHashOfImageFile", // TODO
      external_url: `https://certify.example.org/certificate/${tokenIdStr}`,
      attributes: [
        { trait_type: "Issuer", value: issuer_name },
        { trait_type: "Recipient", value: recipient_name },
        { trait_type: "Course Name", value: course_name },
        { trait_type: "Certificate Type", value: certificate_type },
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
        certificate_type: certificate_type,
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
      certificate_type,
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
      certificate_type,
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
      name: `${certificate_type} - ${recipient_name}`,
      description: `${certificate_type} do ${issuer_name} cấp cho học viên ${recipient_name}.`,
      image: "ipfs://QmHashOfImageFile", // TODO
      external_url: `https://certify.example.org/certificate/NEW`,
      attributes: [
        { trait_type: "Issuer", value: issuer_name },
        { trait_type: "Recipient", value: recipient_name },
        { trait_type: "Course Name", value: course_name },
        { trait_type: "Certificate Type", value: certificate_type },
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
        certificate_type: certificate_type,
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
      certificate_type,
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