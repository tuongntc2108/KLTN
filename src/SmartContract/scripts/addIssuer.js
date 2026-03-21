require("dotenv").config();
const { ethers } = require("ethers");
const abi = require("../artifacts/contracts/MySBT.sol/MySBT.json").abi;

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signer);

  const issuerAddress = "0x4B879e08e8Bbd2517741E9C2b9786764E7fFae9e" // địa chỉ ví bạn muốn cấp quyền issuer

  const tx = await contract.addIssuer(issuerAddress);
  await tx.wait();
  console.log("✅ Issuer added:", issuerAddress);
}

main();