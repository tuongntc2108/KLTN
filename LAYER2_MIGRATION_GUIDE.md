# 🚀 Hướng dẫn chuyển đổi sang Layer 2 (Polygon)

> **Mục đích:** Giảm chi phí gas từ $33/chứng chỉ (Ethereum) xuống $0.01/chứng chỉ (Polygon) - tiết kiệm 99.97%

---

## 📋 Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Chuẩn bị](#2-chuẩn-bị)
3. [Bước 1: Cấu hình Hardhat](#bước-1-cấu-hình-hardhat)
4. [Bước 2: Cập nhật Backend](#bước-2-cập-nhật-backend)
5. [Bước 3: Cập nhật Frontend](#bước-3-cập-nhật-frontend)
6. [Bước 4: Deploy Smart Contract](#bước-4-deploy-smart-contract)
7. [Bước 5: Testing](#bước-5-testing)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Plan](#rollback-plan)

---

## 1. Tổng quan

### So sánh Layer 1 vs Layer 2

| Tiêu chí | Ethereum L1 (Hiện tại) | Polygon L2 (Sau khi migrate) |
|----------|------------------------|------------------------------|
| **Chi phí/tx** | $21-33 USD | $0.01 USD |
| **Tốc độ** | 12-15 giây | 2 giây |
| **Token gas** | ETH ($3,500) | MATIC ($0.90) |
| **Finality** | 12 blocks | 2-3 blocks |
| **Block explorer** | etherscan.io | polygonscan.com |

### Thay đổi chính

```
Chain ID:  11155111 (Sepolia) → 137 (Polygon Mainnet)
           11155111 (Sepolia) → 80002 (Polygon Amoy Testnet)
RPC URL:   Sepolia RPC → Polygon RPC
Token:     ETH → MATIC
Explorer:  etherscan.io → polygonscan.com
```

---

## 2. Chuẩn bị

### 2.1. Kiểm tra môi trường hiện tại

```bash
# Kiểm tra version Node.js (cần >= 16)
node --version

# Kiểm tra npm packages
cd SmartContract
npm list hardhat ethers

# Kiểm tra contract hiện tại
npx hardhat compile
```

### 2.2. Lấy MATIC tokens

#### Testnet (Polygon Amoy - MIỄN PHÍ):
1. Truy cập: https://faucet.polygon.technology/
2. Chọn "Polygon Amoy"
3. Nhập địa chỉ ví
4. Nhận 0.5 MATIC

#### Mainnet (Polygon - TRẢ PHÍ):
1. Mua MATIC trên sàn (Binance, Coinbase...)
2. Withdraw về ví với network = **Polygon**
3. Khuyến nghị: Nạp $50 (~55 MATIC) cho hàng nghìn transactions

### 2.3. API Keys (Tùy chọn - cho verify contract)

Đăng ký tại: https://polygonscan.com/apis
- Tạo API key miễn phí
- Lưu vào file `.env`

---

## Bước 1: Cấu hình Hardhat

### 1.1. Cập nhật `SmartContract/hardhat.config.js`

**Thay thế toàn bộ file bằng:**

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    // ===== ETHEREUM L1 =====
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
    },
    
    // ===== POLYGON L2 =====
    
    // Polygon Amoy Testnet (miễn phí)
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 80002,
      gasPrice: 35000000000, // 35 Gwei
    },
    
    // Polygon Mainnet (production)
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com/",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 137,
      gasPrice: 35000000000, // 35 Gwei
    },
    
    // ===== ARBITRUM L2 (Tùy chọn) =====
    
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 421614,
    },
    
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 42161,
    },
    
    // ===== OPTIMISM L2 (Tùy chọn) =====
    
    optimismSepolia: {
      url: "https://sepolia.optimism.io",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155420,
    },
    
    optimism: {
      url: "https://mainnet.optimism.io",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 10,
    },
  },
  
  // Block explorer verification
  etherscan: {
    apiKey: {
      // Ethereum
      sepolia: process.env.ETHERSCAN_API_KEY,
      
      // Polygon
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygonAmoy: process.env.POLYGONSCAN_API_KEY,
      
      // Arbitrum
      arbitrumOne: process.env.ARBISCAN_API_KEY,
      arbitrumSepolia: process.env.ARBISCAN_API_KEY,
      
      // Optimism
      optimisticEthereum: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
      optimismSepolia: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com"
        }
      }
    ]
  },
};
```

### 1.2. Cập nhật `SmartContract/.env`

```bash
# Private Key (KHÔNG SHARE FILE NÀY!)
PRIVATE_KEY=your_private_key_here

# ===== ETHEREUM L1 =====
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_key

# ===== POLYGON L2 =====
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
POLYGON_RPC_URL=https://polygon-rpc.com/
POLYGONSCAN_API_KEY=your_polygonscan_key

# ===== ARBITRUM L2 (Tùy chọn) =====
ARBISCAN_API_KEY=your_arbiscan_key

# ===== OPTIMISM L2 (Tùy chọn) =====
OPTIMISTIC_ETHERSCAN_API_KEY=your_optimism_key
```

### 1.3. Cải tiến script deploy

**Tạo file mới: `SmartContract/scripts/deploy-l2.js`**

```javascript
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = hre.network.name;
  const chainId = hre.network.config.chainId;
  
  console.log("\n" + "=".repeat(60));
  console.log(`🚀 Deploying MySBT to ${networkName.toUpperCase()}`);
  console.log("=".repeat(60));
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\n📍 Deploying with account: ${deployer.address}`);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInEth = hre.ethers.formatEther(balance);
  console.log(`💰 Account balance: ${balanceInEth} ${getNetworkToken(chainId)}`);
  
  if (parseFloat(balanceInEth) < 0.01) {
    console.error("\n❌ ERROR: Insufficient balance!");
    console.log(`   You need at least 0.01 ${getNetworkToken(chainId)} to deploy`);
    process.exit(1);
  }
  
  // Deploy contract
  console.log("\n⏳ Deploying contract...");
  const MySBT = await hre.ethers.getContractFactory("MySBT");
  const mySBT = await MySBT.deploy(
    "CertChain Certificate", 
    "CERT"
  );
  
  await mySBT.waitForDeployment();
  const contractAddress = await mySBT.getAddress();
  
  console.log(`\n✅ MySBT deployed successfully!`);
  console.log(`📍 Contract address: ${contractAddress}`);
  console.log(`🔗 Explorer: ${getExplorerUrl(chainId, contractAddress)}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: chainId,
    contractAddress: contractAddress,
    deployer: deployer.address,
    deployerBalance: balanceInEth,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
    contractArgs: ["CertChain Certificate", "CERT"],
  };
  
  const outputDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  const filename = path.join(outputDir, `${networkName}-deployment.json`);
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n📝 Deployment info saved to: ${filename}`);
  
  // Copy ABI to Backend
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "MySBT.sol", "MySBT.json");
  const backendAbiPath = path.join(__dirname, "..", "..", "Backend", "abi", "MySBT.json");
  
  if (fs.existsSync(artifactPath)) {
    fs.copyFileSync(artifactPath, backendAbiPath);
    console.log(`📋 ABI copied to Backend/abi/MySBT.json`);
  }
  
  // Verify contract (skip for localhost)
  if (networkName !== "localhost" && networkName !== "hardhat") {
    console.log("\n⏳ Waiting for block confirmations...");
    await mySBT.deploymentTransaction().wait(5);
    
    console.log("\n🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: ["CertChain Certificate", "CERT"],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      if (error.message.includes("already verified")) {
        console.log("✅ Contract already verified!");
      } else {
        console.log("⚠️  Verification failed:", error.message);
        console.log("   You can verify manually later using:");
        console.log(`   npx hardhat verify --network ${networkName} ${contractAddress} "CertChain Certificate" "CERT"`);
      }
    }
  }
  
  // Print next steps
  console.log("\n" + "=".repeat(60));
  console.log("📋 NEXT STEPS:");
  console.log("=".repeat(60));
  console.log(`\n1. Update Backend/.env:`);
  console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`   BLOCKCHAIN_NETWORK=${networkName}`);
  console.log(`\n2. Update Frontend/.env.local:`);
  console.log(`   NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`   NEXT_PUBLIC_CHAIN_ID=${chainId}`);
  console.log(`\n3. Restart Backend and Frontend servers`);
  console.log("\n" + "=".repeat(60));
}

function getNetworkToken(chainId) {
  const tokens = {
    11155111: "ETH",    // Sepolia
    137: "MATIC",       // Polygon Mainnet
    80002: "MATIC",     // Polygon Amoy
    42161: "ETH",       // Arbitrum
    421614: "ETH",      // Arbitrum Sepolia
    10: "ETH",          // Optimism
    11155420: "ETH",    // Optimism Sepolia
  };
  return tokens[chainId] || "ETH";
}

function getExplorerUrl(chainId, address) {
  const explorers = {
    11155111: `https://sepolia.etherscan.io/address/${address}`,
    137: `https://polygonscan.com/address/${address}`,
    80002: `https://amoy.polygonscan.com/address/${address}`,
    42161: `https://arbiscan.io/address/${address}`,
    421614: `https://sepolia.arbiscan.io/address/${address}`,
    10: `https://optimistic.etherscan.io/address/${address}`,
    11155420: `https://sepolia-optimism.etherscan.io/address/${address}`,
  };
  return explorers[chainId] || `Unknown network (chainId: ${chainId})`;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
```

---

## Bước 2: Cập nhật Backend

### 2.1. Cập nhật `Backend/config/blockchain.js`

**Thay thế toàn bộ file:**

```javascript
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Đọc ABI
const abiPath = path.join(__dirname, "../abi/MySBT.json");
const contractArtifact = JSON.parse(fs.readFileSync(abiPath));
const contractABI = contractArtifact.abi;

// ===== CẤU HÌNH MULTI-NETWORK =====
const NETWORKS = {
  sepolia: {
    name: "Ethereum Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC_URL,
    contractAddress: process.env.CONTRACT_ADDRESS_SEPOLIA,
    chainId: 11155111,
    explorerUrl: "https://sepolia.etherscan.io",
    token: "ETH",
  },
  polygonAmoy: {
    name: "Polygon Amoy Testnet",
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/",
    contractAddress: process.env.CONTRACT_ADDRESS_POLYGON_AMOY,
    chainId: 80002,
    explorerUrl: "https://amoy.polygonscan.com",
    token: "MATIC",
  },
  polygon: {
    name: "Polygon Mainnet",
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com/",
    contractAddress: process.env.CONTRACT_ADDRESS_POLYGON,
    chainId: 137,
    explorerUrl: "https://polygonscan.com",
    token: "MATIC",
  },
  arbitrum: {
    name: "Arbitrum One",
    rpcUrl: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    contractAddress: process.env.CONTRACT_ADDRESS_ARBITRUM,
    chainId: 42161,
    explorerUrl: "https://arbiscan.io",
    token: "ETH",
  },
};

// Lấy network từ env (mặc định: sepolia)
const ACTIVE_NETWORK = process.env.BLOCKCHAIN_NETWORK || "sepolia";
const networkConfig = NETWORKS[ACTIVE_NETWORK];

if (!networkConfig) {
  console.error(`❌ Network "${ACTIVE_NETWORK}" not found in config`);
  console.log(`Available networks: ${Object.keys(NETWORKS).join(", ")}`);
  process.exit(1);
}

if (!networkConfig.contractAddress) {
  console.error(`❌ CONTRACT_ADDRESS not set for network "${ACTIVE_NETWORK}"`);
  console.log(`Please set CONTRACT_ADDRESS_${ACTIVE_NETWORK.toUpperCase()} in .env`);
  process.exit(1);
}

// Kết nối blockchain
const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  networkConfig.contractAddress,
  contractABI,
  wallet
);

console.log("\n" + "=".repeat(60));
console.log("🔗 BLOCKCHAIN CONNECTION");
console.log("=".repeat(60));
console.log(`Network:  ${networkConfig.name}`);
console.log(`Chain ID: ${networkConfig.chainId}`);
console.log(`Contract: ${networkConfig.contractAddress}`);
console.log(`Explorer: ${networkConfig.explorerUrl}`);
console.log(`Token:    ${networkConfig.token}`);
console.log("=".repeat(60) + "\n");

module.exports = {
  provider,
  wallet,
  contract,
  networkConfig,
  ACTIVE_NETWORK,
  NETWORKS,
};
```

### 2.2. Cập nhật `Backend/.env`

**Thêm các dòng sau:**

```bash
# ===== BLOCKCHAIN CONFIGURATION =====

# Active network (sepolia | polygonAmoy | polygon | arbitrum)
BLOCKCHAIN_NETWORK=polygonAmoy

# Private key (ví issuer)
PRIVATE_KEY=your_private_key_here

# ===== SEPOLIA (Ethereum L1) =====
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CONTRACT_ADDRESS_SEPOLIA=0x...

# ===== POLYGON AMOY TESTNET (L2) =====
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
CONTRACT_ADDRESS_POLYGON_AMOY=0x...

# ===== POLYGON MAINNET (L2 - Production) =====
POLYGON_RPC_URL=https://polygon-rpc.com/
CONTRACT_ADDRESS_POLYGON=0x...

# ===== ARBITRUM (L2 - Optional) =====
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
CONTRACT_ADDRESS_ARBITRUM=0x...
```

---

## Bước 3: Cập nhật Frontend

### 3.1. Tạo config file mới: `Frontend/lib/blockchain-config.ts`

```typescript
// Blockchain network configuration
export const NETWORKS = {
  sepolia: {
    chainId: '0xaa36a7', // 11155111
    chainIdDecimal: 11155111,
    chainName: 'Sepolia Test Network',
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://sepolia.infura.io/v3/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  
  polygonAmoy: {
    chainId: '0x13882', // 80002
    chainIdDecimal: 80002,
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://rpc-amoy.polygon.technology/'],
    blockExplorerUrls: ['https://amoy.polygonscan.com']
  },
  
  polygon: {
    chainId: '0x89', // 137
    chainIdDecimal: 137,
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://polygon-rpc.com/'],
    blockExplorerUrls: ['https://polygonscan.com']
  },
  
  arbitrum: {
    chainId: '0xa4b1', // 42161
    chainIdDecimal: 42161,
    chainName: 'Arbitrum One',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io']
  }
}

// Active network (change this to switch networks)
export const ACTIVE_NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'polygonAmoy'
export const NETWORK_CONFIG = NETWORKS[ACTIVE_NETWORK as keyof typeof NETWORKS]

if (!NETWORK_CONFIG) {
  throw new Error(`Invalid NEXT_PUBLIC_NETWORK: ${ACTIVE_NETWORK}`)
}

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''

if (!CONTRACT_ADDRESS) {
  console.warn('⚠️  NEXT_PUBLIC_CONTRACT_ADDRESS not set')
}
```

### 3.2. Cập nhật `Frontend/hooks/use-metamask.ts`

**Thay thế phần import và constants:**

```typescript
"use client"

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { NETWORK_CONFIG, CONTRACT_ADDRESS } from '@/lib/blockchain-config'

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      on: (event: string, callback: (...args: any[]) => void) => void
      removeListener: (event: string, callback: (...args: any[]) => void) => void
    }
  }
}

interface MetaMaskState {
  isConnected: boolean
  account: string | null
  chainId: string | null
  isLoading: boolean
  error: string | null
}

// Contract ABI for claimCertificate function
const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "claimCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

export function useMetaMask() {
  // ... (giữ nguyên phần state và isMetaMaskInstalled)
```

**Thay thế function `switchToSepolia`:**

```typescript
  // Switch to configured network
  const switchToNetwork = async () => {
    if (!isMetaMaskInstalled() || !window.ethereum) return false

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainId }]
      })
      return true
    } catch (error: any) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        try {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG]
          })
          return true
        } catch (addError) {
          console.error(`Failed to add ${NETWORK_CONFIG.chainName}:`, addError)
          return false
        }
      }
      console.error(`Failed to switch to ${NETWORK_CONFIG.chainName}:`, error)
      return false
    }
  }
```

**Cập nhật function `claimCertificate`:**

```typescript
  // Claim certificate using MetaMask
  const claimCertificate = async (tokenId: string) => {
    if (!state.isConnected || !state.account) {
      throw new Error('MetaMask not connected')
    }

    if (state.chainId !== NETWORK_CONFIG.chainId) {
      const switched = await switchToNetwork()
      if (!switched) {
        throw new Error(`Failed to switch to ${NETWORK_CONFIG.chainName}`)
      }
    }

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      const tx = await contract.claimCertificate(tokenId)
      const receipt = await tx.wait()

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      }
    } catch (error: any) {
      console.error('Claim error:', error)
      throw new Error(error.message || 'Failed to claim certificate')
    }
  }
```

**Cập nhật return statement:**

```typescript
  return {
    ...state,
    connect,
    disconnect,
    switchToNetwork, // Đổi từ switchToSepolia
    claimCertificate,
    isMetaMaskInstalled: isMetaMaskInstalled()
  }
}
```

### 3.3. Cập nhật `Frontend/hooks/use-wallet-info.ts`

```typescript
import { useState, useEffect } from 'react'
import { NETWORK_CONFIG } from '@/lib/blockchain-config'

interface WalletInfo {
  address: string
  balance: string
  network: string
  chainId: string
}

export function useWalletInfo() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    address: '',
    balance: '0',
    network: NETWORK_CONFIG.chainName,
    chainId: NETWORK_CONFIG.chainId
  })

  useEffect(() => {
    const loadWalletInfo = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            const address = accounts[0]
            const balance = await window.ethereum.request({
              method: 'eth_getBalance',
              params: [address, 'latest']
            })
            const chainId = await window.ethereum.request({ method: 'eth_chainId' })
            
            const networkNames: { [key: string]: string } = {
              [NETWORK_CONFIG.chainId]: NETWORK_CONFIG.chainName,
              '0xaa36a7': 'Sepolia Testnet',
              '0x89': 'Polygon Mainnet',
              '0x13882': 'Polygon Amoy Testnet',
            }

            setWalletInfo({
              address,
              balance: (parseInt(balance, 16) / 1e18).toFixed(4),
              network: networkNames[chainId] || 'Unknown Network',
              chainId
            })
          }
        } catch (error) {
          console.error('Error loading wallet info:', error)
        }
      }
    }

    loadWalletInfo()
  }, [])

  return walletInfo
}
```

### 3.4. Cập nhật `Frontend/.env.local`

```bash
# ===== BLOCKCHAIN CONFIGURATION =====

# Network: sepolia | polygonAmoy | polygon | arbitrum
NEXT_PUBLIC_NETWORK=polygonAmoy

# Contract address (sẽ khác nhau cho mỗi network)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3.5. Cập nhật block explorer links

**Tìm và thay thế tất cả `sepolia.etherscan.io` trong Frontend:**

```bash
# Tìm kiếm
grep -r "sepolia.etherscan.io" Frontend/

# Thay thế bằng dynamic URL
```

**Tạo helper function `Frontend/lib/explorer.ts`:**

```typescript
import { NETWORK_CONFIG } from './blockchain-config'

export function getExplorerUrl(type: 'tx' | 'address' | 'token', value: string): string {
  const baseUrl = NETWORK_CONFIG.blockExplorerUrls[0]
  
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${value}`
    case 'address':
      return `${baseUrl}/address/${value}`
    case 'token':
      return `${baseUrl}/token/${value}`
    default:
      return baseUrl
  }
}
```

---

## Bước 4: Deploy Smart Contract

### 4.1. Test deployment lên Polygon Amoy (Testnet - FREE)

```bash
cd SmartContract

# Compile contract
npx hardhat compile

# Deploy to Polygon Amoy Testnet
npx hardhat run scripts/deploy-l2.js --network polygonAmoy

# Lưu lại contract address từ output
```

**Output mẫu:**

```
============================================================
🚀 Deploying MySBT to POLYGONAMOY
============================================================

📍 Deploying with account: 0x1234...5678
💰 Account balance: 0.5 MATIC

⏳ Deploying contract...

✅ MySBT deployed successfully!
📍 Contract address: 0xABCD...EF01
🔗 Explorer: https://amoy.polygonscan.com/address/0xABCD...EF01

📝 Deployment info saved to: deployments/polygonAmoy-deployment.json
📋 ABI copied to Backend/abi/MySBT.json

⏳ Waiting for block confirmations...
🔍 Verifying contract on block explorer...
✅ Contract verified successfully!

============================================================
📋 NEXT STEPS:
============================================================

1. Update Backend/.env:
   CONTRACT_ADDRESS_POLYGON_AMOY=0xABCD...EF01
   BLOCKCHAIN_NETWORK=polygonAmoy

2. Update Frontend/.env.local:
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xABCD...EF01
   NEXT_PUBLIC_NETWORK=polygonAmoy

3. Restart Backend and Frontend servers
============================================================
```

### 4.2. Cập nhật environment variables

**Backend/.env:**

```bash
BLOCKCHAIN_NETWORK=polygonAmoy
CONTRACT_ADDRESS_POLYGON_AMOY=0xABCD...EF01  # Thay bằng địa chỉ thực tế
```

**Frontend/.env.local:**

```bash
NEXT_PUBLIC_NETWORK=polygonAmoy
NEXT_PUBLIC_CONTRACT_ADDRESS=0xABCD...EF01  # Thay bằng địa chỉ thực tế
```

### 4.3. Add Issuer role

```bash
cd SmartContract

# Chạy script add issuer
node scripts/addIssuer.js
```

Hoặc sửa `scripts/addIssuer.js` để tương thích multi-network:

```javascript
const hre = require("hardhat");
const { contract } = require("../Backend/config/blockchain");

async function main() {
  const issuerAddress = "0x..."; // Địa chỉ ví issuer
  
  console.log(`Adding issuer: ${issuerAddress}`);
  
  const tx = await contract.grantRole(
    await contract.ISSUER_ROLE(),
    issuerAddress
  );
  
  await tx.wait();
  console.log("✅ Issuer added successfully!");
  console.log(`Transaction: ${tx.hash}`);
}

main().catch(console.error);
```

---

## Bước 5: Testing

### 5.1. Restart services

```bash
# Terminal 1 - Backend
cd Backend
npm start

# Terminal 2 - Frontend
cd Frontend
npm run dev
```

### 5.2. Test flow đầy đủ

**Checklist:**

- [ ] Kết nối MetaMask với Polygon Amoy
- [ ] Tạo chứng chỉ mới từ Dashboard
- [ ] Kiểm tra transaction trên Polygonscan
- [ ] Student claim chứng chỉ
- [ ] Verify chứng chỉ trên trang Verify
- [ ] Kiểm tra NFT trong ví MetaMask

### 5.3. So sánh chi phí

**Ghi lại gas cost từ transactions:**

```
Issue Certificate:
- Gas used: 200,000
- Gas price: 35 Gwei
- Cost: 200,000 × 35 Gwei = 0.007 MATIC
- USD value: $0.0063

Claim Certificate:
- Gas used: 120,000
- Gas price: 35 Gwei
- Cost: 120,000 × 35 Gwei = 0.0042 MATIC
- USD value: $0.0038

TOTAL: ~$0.01 USD
```

---

## Troubleshooting

### Lỗi thường gặp

#### 1. "Insufficient funds"

```bash
# Kiểm tra balance
npx hardhat run scripts/check-balance.js --network polygonAmoy

# Lấy test MATIC từ faucet
# https://faucet.polygon.technology/
```

#### 2. "Contract not deployed"

```bash
# Kiểm tra deployment
cat SmartContract/deployments/polygonAmoy-deployment.json

# Verify contract address trong .env
```

#### 3. "Wrong network"

```typescript
// Frontend: Kiểm tra NEXT_PUBLIC_NETWORK
console.log('Active network:', process.env.NEXT_PUBLIC_NETWORK)

// Backend: Kiểm tra BLOCKCHAIN_NETWORK
console.log('Active network:', process.env.BLOCKCHAIN_NETWORK)
```

#### 4. "Transaction underpriced"

```javascript
// Trong blockchain.js, tăng gas price
const tx = await contract.issueCertificate(...args, {
  gasPrice: ethers.parseUnits('50', 'gwei') // Tăng từ 35 lên 50
})
```

#### 5. MetaMask không switch network

```typescript
// Xóa cache MetaMask và reconnect
await window.ethereum.request({
  method: 'wallet_requestPermissions',
  params: [{ eth_accounts: {} }]
})
```

---

## Rollback Plan

### Nếu cần quay lại Sepolia:

**1. Backend/.env:**

```bash
BLOCKCHAIN_NETWORK=sepolia
```

**2. Frontend/.env.local:**

```bash
NEXT_PUBLIC_NETWORK=sepolia
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # Address cũ trên Sepolia
```

**3. Restart services**

```bash
# Không cần deploy lại, chỉ đổi config
```

---

## Production Deployment (Polygon Mainnet)

### Khi sẵn sàng production:

**1. Mua MATIC:**

```
- Mua ~$50-100 MATIC từ exchange
- Withdraw về ví với network = Polygon
```

**2. Deploy to Polygon Mainnet:**

```bash
npx hardhat run scripts/deploy-l2.js --network polygon
```

**3. Update production env:**

```bash
# Backend/.env
BLOCKCHAIN_NETWORK=polygon
CONTRACT_ADDRESS_POLYGON=0x...

# Frontend/.env.local (production)
NEXT_PUBLIC_NETWORK=polygon
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

**4. Monitor costs:**

```bash
# Tạo script monitor chi phí
# SmartContract/scripts/monitor-costs.js
```

---

## Tổng kết

### ✅ Sau khi hoàn thành migration:

- Chi phí giảm từ $33 → $0.01 (99.97%)
- Tốc độ tăng từ 15s → 2s (7.5x nhanh hơn)
- Contract code không thay đổi
- User experience tốt hơn (rẻ + nhanh)

### 📊 Ước tính tiết kiệm:

```
1,000 chứng chỉ/tháng:
- Ethereum L1: $33,000/tháng ❌
- Polygon L2:  $10/tháng ✅
- Tiết kiệm:   $32,990/tháng (99.97%)
```

### 🎯 Recommended networks theo use case:

| Use Case | Testnet | Mainnet | Lý do |
|----------|---------|---------|-------|
| **Education** | Polygon Amoy | **Polygon** | Rẻ nhất |
| **Enterprise** | Arbitrum Sepolia | **Arbitrum** | Bảo mật cao |
| **Startup** | Polygon Amoy | **Polygon** | Chi phí thấp |
| **High-value** | Ethereum Sepolia | **Ethereum** | Decentralized nhất |

---

## Hỗ trợ

### Resources:

- Polygon Docs: https://docs.polygon.technology/
- Hardhat Docs: https://hardhat.org/docs
- Ethers.js v6: https://docs.ethers.org/v6/

### Community:

- Polygon Discord: https://discord.gg/polygon
- Hardhat Discord: https://discord.gg/hardhat

---
