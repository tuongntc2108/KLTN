const { contract } = require("../config/blockchain");
const { ethers } = require("ethers");
const db = require("../config/pg");
const { createIssuerWithUser } = require("../utils/userUtils");

async function getIssuerById(issuerId) {
  const result = await db.pool.query(
    `
      SELECT id, name, email, wallet_address, organization, website, created_at
      FROM issuers
      WHERE id = $1
    `,
    [issuerId]
  );

  return result.rows[0] || null;
}

async function getCertificateCountByWallet(walletAddress) {
  const result = await db.pool.query(
    `
      SELECT COUNT(*)::int AS certificate_count
      FROM certificates
      WHERE LOWER(issuer) = LOWER($1)
    `,
    [walletAddress]
  );

  return result.rows[0]?.certificate_count || 0;
}

exports.addIssuer = async (req, res) => {
  try {
    const { name, email, wallet_address, organization, website } = req.body;

    if (!name || !email || !wallet_address) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        required: ["name", "email", "wallet_address"]
      });
    }

    if (!ethers.isAddress(wallet_address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address"
      });
    }

    const existingIssuer = await db.pool.query(
      "SELECT id FROM issuers WHERE email = $1 OR wallet_address = $2",
      [email.toLowerCase(), wallet_address]
    );

    if (existingIssuer.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Issuer already exists"
      });
    }

    const tx = await contract.addIssuer(wallet_address);
    const receipt = await tx.wait();

    const issuer = await createIssuerWithUser({
      name,
      email: email.toLowerCase(),
      wallet_address,
      organization: organization || null,
      website: website || null
    });

    return res.status(201).json({
      success: true,
      message: "Issuer created successfully",
      issuer,
      transaction_hash: receipt.transactionHash
    });
  } catch (error) {
    console.error("Add issuer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add issuer",
      error: error.message
    });
  }
};

exports.getIssuers = async (req, res) => {
  try {
    const result = await db.pool.query(
      `
        SELECT
          i.id,
          i.name,
          i.email,
          i.wallet_address,
          i.organization,
          i.website,
          i.created_at,
          COUNT(c.id)::int AS certificate_count
        FROM issuers i
        LEFT JOIN certificates c ON LOWER(c.issuer) = LOWER(i.wallet_address)
        GROUP BY i.id, i.name, i.email, i.wallet_address, i.organization, i.website, i.created_at
        ORDER BY i.created_at DESC
      `
    );

    return res.status(200).json({
      success: true,
      issuers: result.rows
    });
  } catch (error) {
    console.error("Get issuers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch issuers",
      error: error.message
    });
  }
};

exports.updateIssuer = async (req, res) => {
  try {
    const issuerId = Number(req.params.id);
    const { name, organization, website } = req.body;

    if (!Number.isInteger(issuerId) || issuerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid issuer ID"
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Issuer name is required"
      });
    }

    const issuer = await getIssuerById(issuerId);
    if (!issuer) {
      return res.status(404).json({
        success: false,
        message: "Issuer not found"
      });
    }

    const certificateCount = await getCertificateCountByWallet(issuer.wallet_address);
    if (certificateCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot update issuer because certificates have already been issued",
        certificate_count: certificateCount
      });
    }

    const result = await db.pool.query(
      `
        UPDATE issuers
        SET
          name = $1,
          organization = $2,
          website = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING id, name, email, wallet_address, organization, website, created_at
      `,
      [
        String(name).trim(),
        organization ? String(organization).trim() : null,
        website ? String(website).trim() : null,
        issuerId
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Issuer updated successfully",
      issuer: {
        ...result.rows[0],
        certificate_count: 0
      }
    });
  } catch (error) {
    console.error("Update issuer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update issuer",
      error: error.message
    });
  }
};

exports.deleteIssuer = async (req, res) => {
  try {
    const issuerId = Number(req.params.id);

    if (!Number.isInteger(issuerId) || issuerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid issuer ID"
      });
    }

    const issuer = await getIssuerById(issuerId);
    if (!issuer) {
      return res.status(404).json({
        success: false,
        message: "Issuer not found"
      });
    }

    const certificateCount = await getCertificateCountByWallet(issuer.wallet_address);
    if (certificateCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete issuer because certificates have already been issued",
        certificate_count: certificateCount
      });
    }

    const tx = await contract.removeIssuer(issuer.wallet_address);
    const receipt = await tx.wait();

    await db.pool.query("DELETE FROM issuers WHERE id = $1", [issuerId]);

    return res.status(200).json({
      success: true,
      message: "Issuer deleted successfully",
      transaction_hash: receipt.transactionHash
    });
  } catch (error) {
    console.error("Delete issuer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete issuer",
      error: error.message
    });
  }
};
