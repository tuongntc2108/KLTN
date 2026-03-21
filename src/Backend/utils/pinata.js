const axios = require("axios");
require("dotenv").config();

const PINATA_BASE_URL = "https://api.pinata.cloud/pinning";

async function uploadMetadataToPinata(metadata) {
  try {
    const res = await axios.post(
      `${PINATA_BASE_URL}/pinJSONToIPFS`,
      metadata,
      {
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
        },
      }
    );
    return `ipfs://${res.data.IpfsHash}`;
  } catch (err) {
    console.error("❌ Lỗi upload Pinata:", err.response?.data || err.message);
    throw new Error("Không thể upload metadata lên Pinata");
  }
}

module.exports = { uploadMetadataToPinata };
