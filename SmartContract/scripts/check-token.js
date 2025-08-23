const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const tokenId = 3; // Thay đổi nếu cần

  const MySBT = await ethers.getContractAt("MySBT", contractAddress);

  try {
    const owner = await MySBT.ownerOf(tokenId);
    console.log(`✅ Token ID ${tokenId} tồn tại. Owner: ${owner}`);
  } catch (err) {
    console.error(`❌ Token ID ${tokenId} không tồn tại.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
