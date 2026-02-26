const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const abiPath = path.join(__dirname, "../abi/MySBT.json");
const contractArtifact = JSON.parse(fs.readFileSync(abiPath));
const contractABI = contractArtifact.abi;

// Configure provider with retry and timeout settings
const providerOptions = {
  staticNetwork: ethers.Network.from(11155111), // Sepolia chain ID
  batchMaxCount: 1, // Disable batching to avoid conflicts
};

// Create provider with fallback URLs
const primaryRpcUrl = process.env.SEPOLIA_RPC_URL;
const fallbackRpcUrls = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://1rpc.io/sepolia"
];

let provider;
try {
  // Try primary provider first
  provider = new ethers.JsonRpcProvider(primaryRpcUrl, undefined, providerOptions);
  
  // Add retry logic by wrapping in FallbackProvider
  const providers = [
    { provider: provider, priority: 1, stallTimeout: 2000, weight: 2 }
  ];
  
  // Add fallback providers
  fallbackRpcUrls.forEach((url, index) => {
    providers.push({
      provider: new ethers.JsonRpcProvider(url, undefined, providerOptions),
      priority: index + 2,
      stallTimeout: 3000,
      weight: 1
    });
  });
  
  provider = new ethers.FallbackProvider(providers, undefined, {
    cacheTimeout: 5000,
    pollingInterval: 12000,
    eventWorkers: 1
  });
  
  console.log("✅ Blockchain provider initialized with fallback support");
} catch (error) {
  console.error("❌ Failed to initialize provider:", error.message);
  // Fallback to simple provider
  provider = new ethers.JsonRpcProvider(primaryRpcUrl);
}

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Sử dụng dynamic gas pricing để tránh lỗi replacement transaction underpriced
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

module.exports = { provider, wallet, contract };
