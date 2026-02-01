require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const STATUS = ["Issued", "Active", "Expired", "Revoked", "Replaced"];

async function checkTokenStatus(tokenId) {
  try {
    console.log(`\n🔍 Checking status for token ID: ${tokenId}`);
    console.log("=" .repeat(60));

    // Initialize provider (read-only, no signer needed)
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // Load contract ABI
    const abiPath = path.join(__dirname, "../abi/MySBT.json");
    const contractArtifact = JSON.parse(fs.readFileSync(abiPath));
    const contractABI = contractArtifact.abi;
    
    // Create contract instance (read-only)
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, provider);
    
    // Parse token ID
    let parsedTokenId;
    try {
      if (tokenId.toString().startsWith('0x')) {
        parsedTokenId = ethers.getBigInt(tokenId);
      } else {
        parsedTokenId = ethers.getBigInt(tokenId);
      }
    } catch (e) {
      throw new Error(`Invalid token ID format: ${tokenId}`);
    }

    console.log(`📦 Token ID (BigInt): ${parsedTokenId.toString()}`);
    console.log("");

    // Fetch certificate data from blockchain
    console.log("📡 Fetching certificate data from blockchain...");
    const cert = await contract.certificates(parsedTokenId);
    
    console.log("\n✅ Certificate Data:");
    console.log("─".repeat(60));
    console.log(`  Holder:           ${cert.holder}`);
    console.log(`  Issuer:           ${cert.issuer}`);
    console.log(`  Status:           ${STATUS[Number(cert.status)]} (${Number(cert.status)})`);
    console.log(`  Metadata URI:     ${cert.metadataURI}`);
    console.log(`  Recipient Name:   ${cert.recipientName}`);
    console.log(`  Certificate Name: ${cert.certificateName}`);
    console.log(`  Course ID:        ${cert.courseId}`);
    console.log(`  Verification Code: ${cert.verificationCode}`);
    
    // Format dates
    const issuedDate = new Date(Number(cert.issuedDate) * 1000);
    const expireDate = new Date(Number(cert.expireDate) * 1000);
    
    console.log(`  Issued Date:      ${issuedDate.toISOString()} (${Number(cert.issuedDate)}s)`);
    console.log(`  Expire Date:      ${expireDate.toISOString()} (${Number(cert.expireDate)}s)`);
    
    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    const isExpired = Number(cert.expireDate) < now;
    
    console.log(`\n⏰ Time Check:`);
    console.log(`  Current timestamp: ${now}`);
    console.log(`  Is Expired:        ${isExpired ? "🔴 YES" : "🟢 NO"}`);
    
    // Try to verify using the verify function
    console.log("\n🔐 Verification Check:");
    try {
      const verifyResult = await contract.verifyCertificate(parsedTokenId);
      const isValid = verifyResult[1];
      const statusMessage = verifyResult[2];
      
      console.log(`  Is Valid:         ${isValid ? "✅ YES" : "❌ NO"}`);
      console.log(`  Status Message:   ${statusMessage}`);
    } catch (verifyError) {
      console.log(`  Verification Error: ${verifyError.message}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log(`📊 Summary: Token ${tokenId} is in "${STATUS[Number(cert.status)]}" status`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// Get token ID from command line argument
const tokenId = process.argv[2] || "67";

checkTokenStatus(tokenId).then(() => {
  process.exit(0);
}).catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
