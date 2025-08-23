const { ethers } = require("hardhat");

async function main() {
  try {
    // Lấy network info
    const network = await ethers.provider.getNetwork();
    console.log(`🌐 Deploying to network: ${network.name} (Chain ID: ${network.chainId})`);

    // Lấy deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deployer account:", deployer.address);

    // Kiểm tra balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
      throw new Error("❌ Deployer account has no ETH balance");
    }

    // Deploy contract
    console.log("🚀 Deploying contract...");
    const ContractFactory = await ethers.getContractFactory("MySBT"); 
    
    // Constructor parameters
    const contractName = "My Soulbound Token";
    const contractSymbol = "MSBT";
    
    const deployedContract = await ContractFactory.deploy(contractName, contractSymbol);
    
    if (!deployedContract) {
      throw new Error("❌ Contract deployment returned undefined");
    }

    console.log("⏳ Waiting for deployment confirmation...");
    await deployedContract.waitForDeployment();

    const contractAddress = await deployedContract.getAddress();
    console.log("✅ Contract deployed to:", contractAddress);

    // Verify deployment
    const code = await ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error("❌ Contract deployment failed - no code at address");
    }

    console.log("🔍 Contract verification: Success");
    console.log("📋 Transaction hash:", deployedContract.deploymentTransaction().hash);

    return contractAddress;

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    // Thêm thông tin debug
    if (error.code === "INSUFFICIENT_FUNDS") {
      console.error("💡 Solution: Add more ETH to your wallet");
    } else if (error.code === "NETWORK_ERROR") {
      console.error("💡 Solution: Check your internet connection and Infura settings");
    } else if (error.message.includes("nonce")) {
      console.error("💡 Solution: Reset your wallet account or wait a moment");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });