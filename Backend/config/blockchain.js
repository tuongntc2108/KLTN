const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const abiPath = path.join(__dirname, "../abi/MySBT.json");
const contractArtifact = JSON.parse(fs.readFileSync(abiPath));
const contractABI = contractArtifact.abi;

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

module.exports = { provider, wallet, contract };
