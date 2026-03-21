const { contract } = require("../config/blockchain");
const { ethers } = require("ethers");
const axios = require("axios");
const db = require("../config/pg");

async function parseMetadata(metadataURI, functionName = "") {
  let issuerInfo = {
    name: "Chua xac dinh",
    id: "N/A",
    url: "N/A",
  };
  let fileHash = {
    sha256: "N/A",
    pdf_url: "N/A",
  };

  try {
    if (metadataURI && metadataURI.trim() !== "") {
      console.log(`${functionName} - Fetching metadata from:`, metadataURI);

      let fetchUrl = metadataURI;
      if (metadataURI.startsWith("ipfs://")) {
        fetchUrl = metadataURI.replace("ipfs://", "https://ipfs.io/ipfs/");
      }

      const metadataResponse = await axios.get(fetchUrl, {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "User-Agent": "Certificate-Verifier/1.0",
        },
      });

      const metadata = metadataResponse.data;
      console.log(`${functionName} - Metadata received:`, JSON.stringify(metadata, null, 2));

      if (metadata.issuer) {
        console.log(`${functionName} - Found issuer in metadata:`, metadata.issuer);
        issuerInfo = {
          name: metadata.issuer.name || "Chua xac dinh",
          id: metadata.issuer.id || "N/A",
          url: metadata.issuer.url || "N/A",
        };
      } else if (metadata.attributes && Array.isArray(metadata.attributes)) {
        const issuerAttr = metadata.attributes.find(
          (attr) => attr.trait_type === "Issuer" || attr.trait_type === "issuer"
        );
        if (issuerAttr) {
          console.log(`${functionName} - Found issuer in attributes:`, issuerAttr.value);
          issuerInfo.name = issuerAttr.value;
        }
      }

      if (metadata.file_hash) {
        console.log(`${functionName} - Found file_hash in metadata:`, metadata.file_hash);
        fileHash = {
          sha256: metadata.file_hash.sha256 || "N/A",
          pdf_url: metadata.file_hash.pdf_url || "N/A",
        };
      }

      console.log(`${functionName} - Final issuerInfo:`, issuerInfo);
      console.log(`${functionName} - Final fileHash:`, fileHash);
    } else {
      console.log(`${functionName} - No metadata URI provided`);
    }
  } catch (error) {
    console.error(`${functionName} - Failed to fetch metadata:`, error.message);
    if (error.response) {
      console.error(`${functionName} - Response status:`, error.response.status);
      console.error(`${functionName} - Response data:`, error.response.data);
    }
    if (error.code) {
      console.error(`${functionName} - Error code:`, error.code);
    }
  }

  return { issuerInfo, fileHash };
}

async function getRevocationReason(tokenId) {
  try {
    const result = await db.query(
      `SELECT reason FROM certificate_events 
       WHERE token_id = $1 AND event_type = 'Revoked' 
       ORDER BY block_number DESC LIMIT 1`,
      [tokenId?.toString()]
    );

    if (result.rows && result.rows.length > 0) {
      return result.rows[0].reason;
    }
  } catch (error) {
    console.warn("Failed to get revocation reason:", error.message);
  }

  return null;
}

async function getCertificateEvents(tokenId) {
  try {
    const result = await db.query(
      `SELECT id, token_id, event_type, reason, related_token, block_number, tx_hash, created_at
       FROM certificate_events
       WHERE token_id = $1
       ORDER BY created_at ASC, block_number ASC`,
      [tokenId?.toString()]
    );

    const events = (result.rows || []).map((ev) => ({
      id: ev.id,
      token_id: ev.token_id?.toString?.() || String(ev.token_id),
      type: ev.event_type,
      issuer: ev.issuer,
      holder: ev.holder,
      reason: ev.reason || null,
      related_token: ev.related_token ? (ev.related_token?.toString?.() || String(ev.related_token)) : null,
      block_number: ev.block_number ? Number(ev.block_number) : null,
      tx_hash: ev.tx_hash,
      created_at: ev.created_at ? new Date(ev.created_at).toISOString() : null,
    }));

    return events;
  } catch (error) {
    console.warn("Failed to get certificate events:", error.message);
    return [];
  }
}

async function getCertificateFromDb(tokenId) {
  try {
    const result = await db.query(
      "SELECT token_id, course_name, course_id, certificate_name, recipient_name FROM certificates WHERE token_id = $1",
      [tokenId?.toString()]
    );
    return result.rows && result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.warn("Failed to get certificate from DB:", error.message);
    return null;
  }
}

async function buildCertificateViewByTokenId(tokenId) {
  try {
    if (!tokenId) {
      return {
        statusCode: 400,
        payload: {
          success: false,
          message: "Token ID là bắt buộc",
          data: { verified: false },
        },
      };
    }

    let parsedTokenId;
    try {
      parsedTokenId = tokenId.startsWith("0x") ? ethers.getBigInt(tokenId) : ethers.getBigInt(tokenId);
    } catch (e) {
      return {
        statusCode: 400,
        payload: {
          success: false,
          message: "Định dạng Token ID không hợp lệ",
          data: { verified: false },
        },
      };
    }

    let result;
    try {
      result = await contract.verifyCertificate.staticCall(parsedTokenId);
    } catch (e) {
      const msg = e?.reason || e?.shortMessage || e?.message || "Không tìm thấy token trên blockchain";
      console.log("Verify by token ID error:", msg);
      console.error("Full error:", e);
      return {
        statusCode: 404,
        payload: {
          success: false,
          message: "Không tìm thấy chứng chỉ.",
          data: {
            verified: false,
            error: msg,
          },
        },
      };
    }

    const cert = result[0];
    const isValid = result[1];
    const statusMessage = result[2];

    // Validate that cert exists and has required properties
    if (!cert || !cert.expireDate) {
      return {
        statusCode: 404,
        payload: {
          success: false,
          message: "Khong tim thay chung chi hoac du lieu khong hop le.",
          data: {
            verified: false,
            error: "Invalid certificate data from blockchain",
          },
        },
      };
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const isExpiredByDate = Number(cert.expireDate) < currentTime;

    if (isExpiredByDate) {
      try {
        const certOnChain = await contract.certificates(parsedTokenId);
        const statusOnChain = Number(certOnChain.status);

        if (statusOnChain !== 2) {
          console.log(
            `\ud83d\udcdd Certificate ${tokenId} is expired by date but status on-chain is ${statusOnChain}, updating...`
          );
          const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
          const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
          const contractWithSigner = contract.connect(wallet);

          const tx = await contractWithSigner.updateExpiredStatus(parsedTokenId);
          const receipt = await tx.wait();

          let txHash = receipt?.transactionHash || receipt?.hash || tx?.hash;
          console.log(`\u2705 Receipt keys:`, Object.keys(receipt || {}));
          console.log(`\u2705 Transaction hash:`, txHash);
          console.log(`\u2705 TX hash:`, tx?.hash);

          if (!txHash) {
            console.warn(`\u26a0\ufe0f Transaction hash is null or undefined in receipt`);
            console.warn(`\u26a0\ufe0f Receipt object:`, receipt);
          } else {
            const selectResult = await db.query(
              `SELECT id FROM certificate_events 
             WHERE token_id = $1 AND event_type = 'Expired' 
             ORDER BY block_number DESC LIMIT 1`,
              [tokenId]
            );

            console.log(`\ud83d\udd0d Select result:`, selectResult?.rows);

            if (!selectResult?.rows || selectResult.rows.length === 0) {
              console.warn(
                `\u26a0\ufe0f No expired certificate event found for token_id: ${tokenId}, creating new record...`
              );

              const insertResult = await db.query(
                `INSERT INTO certificate_events (token_id, event_type, tx_hash, created_at)
               VALUES ($1, $2, $3, NOW())
               RETURNING id`,
                [tokenId, "Expired", txHash]
              );

              console.log(`\u2705 Created new certificate event record:`, insertResult.rows[0].id);
            } else {
              const updateResult = await db.query(
                `UPDATE certificate_events 
               SET tx_hash = $1 
               WHERE id = $2`,
                [txHash, selectResult.rows[0].id]
              );

              console.log(`\u2705 Database updated with tx_hash: ${txHash}`);
            }
          }
        } else {
          console.log(`\u2139\ufe0f Certificate ${tokenId} already has Expired status on-chain, skipping update`);
        }
      } catch (updateError) {
        console.warn(`\u26a0\ufe0f Failed to update expired status on-chain: ${updateError.message}`);
      }
    }

    const { issuerInfo, fileHash } = await parseMetadata(cert.metadataURI, "verifyByTokenId");

    let revocationReason = null;
    if (Number(cert.status) === 3) {
      revocationReason = await getRevocationReason(tokenId);
    }

    const issueDate = new Date(Number(cert.issuedDate) * 1000).toISOString();
    const expireDate = new Date(Number(cert.expireDate) * 1000).toISOString();

    let status = "unknown";
    let message = "";

    switch (Number(cert.status)) {
      case 0:
        status = "Issued";
        message = isValid ? "Xac thuc chung chi thanh cong." : "Chung chi da duoc cap nhung chua duoc kich hoat.";
        break;
      case 1:
        status = "Active";
        message = isValid ? "Xac thuc chung chi thanh cong." : "Chung chi dang hoat dong.";
        break;
      case 2:
        status = "Expired";
        message = "Chung chi da het han.";
        break;
      case 3:
        status = "Revoked";
        message = "Chung chi da bi thu hoi.";
        break;
      case 4:
        status = "Replaced";
        message = "Chung chi da duoc thay the bang chung chi moi.";
        break;
      default:
        status = "Unknown";
        message = "Trang thai chung chi khong xac dinh.";
    }

    const events = await getCertificateEvents(tokenId);
    const dbCert = await getCertificateFromDb(tokenId);
    const courseId = dbCert?.course_id || cert.courseId || null;

    const responseData = {
      success: isValid,
      message: message || statusMessage,
      data: {
        verified: Boolean(isValid),
        certificate: {
          token_id: tokenId,
          status: status,
          metadata_uri: cert.metadataURI,
          revocation_reason: revocationReason,
          events,

          issuer: issuerInfo,

          recipient: {
            full_name: dbCert?.recipient_name || "Chua xac dinh",
            wallet_address: cert.holder,
            email_hash: "hash-email-tam-thoi",
          },

          certificate_detail: {
            course_id: courseId,
            course_name:
              dbCert?.course_name || (dbCert?.course_id ? dbCert.course_id.toString() : cert.courseId || "Chua xac dinh"),
            certificate_name: dbCert?.certificate_name || "Chua xac dinh",
            issue_date: issueDate,
            expire_date: expireDate,
            status: status,
          },

          file_hash: fileHash,

          verification: {
            blockchain: "Sepolia",
            chain_id: 11155111,
            smart_contract: process.env.CONTRACT_ADDRESS,
            verified_at: new Date().toISOString(),
          },
        },
      },
    };

    return { statusCode: 200, payload: responseData };
  } catch (err) {
    console.error("Verify by token ID error:", err);

    if (err.code === "NETWORK_ERROR" || err.code === "TIMEOUT") {
      return {
        statusCode: 500,
        payload: {
          success: false,
          message: "Xac minh that bai do loi ket noi blockchain.",
          data: {
            verified: false,
            error: "Blockchain connection error",
          },
        },
      };
    }

    return {
      statusCode: 500,
      payload: {
        success: false,
        message: "Xac minh that bai do loi blockchain.",
        data: {
          verified: false,
          error: err.message,
        },
      },
    };
  }
}

module.exports = {
  parseMetadata,
  getRevocationReason,
  getCertificateEvents,
  getCertificateFromDb,
  buildCertificateViewByTokenId,
};
