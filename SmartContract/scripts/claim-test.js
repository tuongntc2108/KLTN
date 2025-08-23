require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const tokenId = 24;

  // Load environment
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Load ABI
  const MySBT = await ethers.getContractAt("MySBT", contractAddress, wallet);

  try {
    console.log(`📝 Claiming token ID ${tokenId}...`);

    const tx = await MySBT.claimCertificate(tokenId);
    console.log("⏳ Waiting for confirmation...");
    await tx.wait();

    console.log("✅ Claim successful!");
    console.log(`🔗 Tx Hash: ${tx.hash}`);
  } catch (error) {
    console.error("❌ Claim failed:", error.message);
  }
}

main();
