const { contract } = require("../config/blockchain");
const { ethers } = require("ethers");
const db = require("../config/pg");
const { createIssuerWithUser } = require("../utils/userUtils");

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
      "SELECT id, name, email, wallet_address, organization, website, created_at FROM issuers ORDER BY created_at DESC"
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
