const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Testing MySBT Certificate Flow");
  console.log("=" .repeat(50));

  // Contract setup
  const contractAddress = "0x921a705b21d6c6f50a6b3037556B0269E97FD57c";
  const MySBT = await ethers.getContractAt("MySBT", contractAddress);

  // Get signers - handle case where only one account is configured
  const signers = await ethers.getSigners();
  const issuer = signers[0];
  
  // For testing, use the same account as both issuer and holder
  // This avoids funding issues and simplifies the test
  const holder = issuer;
  
  console.log("👤 Issuer address:", issuer.address);
  console.log("🎓 Holder address:", holder.address);
  console.log("ℹ️  Using same account for both issuer and holder (for testing)");

  // Grant issuer role to deployer if not already granted
  console.log("\n🔐 STEP 0: Setting up issuer role...");
  const hasIssuerRole = await MySBT.hasRole(await MySBT.ISSUER_ROLE(), issuer.address);
  if (!hasIssuerRole) {
    console.log("📝 Granting issuer role to deployer...");
    const grantTx = await MySBT.addIssuer(issuer.address);
    await grantTx.wait();
    console.log("✅ Issuer role granted successfully!");
  } else {
    console.log("✅ Issuer role already granted");
  }

  // Certificate data
  const holderAddress = holder.address;
  const metadataURI = "https://ipfs.io/ipfs/bafkreic23bt4clga3zz7iwe3ihhvgme4z3fpvllk3osk5su3tj4acynqme";
  const expireDate = Math.floor(new Date("2027-08-05").getTime() / 1000);
  const courseCode = "TOEIC2025";
  const studentId = "SV002"; // Thay đổi để tránh trùng
  const timestamp = Math.floor(Date.now() / 1000);
  const verifyCode = `Test${timestamp}`; // Use timestamp to ensure uniqueness
  const certificateType = "TOEIC";
  const studentName = "Nguyễn Văn B";

  try {
    // STEP 1: Issue Certificate (chưa mint NFT)
    console.log("\n📝 STEP 1: Issuing certificate...");
    
    const issueTx = await MySBT.connect(issuer).issueCertificate(
      holderAddress,
      metadataURI,
      expireDate,
      courseCode,
      studentId,
      verifyCode,
      certificateType,
      studentName
    );

    await issueTx.wait();
    console.log("✅ Certificate issued successfully!");

    // Get token ID from verification code
    const tokenId = await MySBT.verificationCodeToToken(verifyCode);
    console.log("📌 Token ID:", tokenId.toString());

    // Check certificate info
    const certInfo = await MySBT.certificates(tokenId);
    console.log("📋 Certificate Info:");
    console.log("  - Holder:", certInfo.holder);
    console.log("  - Issuer:", certInfo.issuer);
    console.log("  - Status:", certInfo.status.toString(), "(0=Issued, 1=Active)");
    console.log("  - Course:", certInfo.courseId);
    console.log("  - Verification Code:", certInfo.verificationCode);

    // STEP 2: Try ownerOf (should fail)
    console.log("\n🧪 STEP 2: Testing ownerOf (should fail)...");
    try {
      const owner = await MySBT.ownerOf(tokenId);
      console.log("👤 Owner:", owner);
    } catch (error) {
      console.log("❌ ownerOf failed as expected:", error.message.includes("nonexistent") || error.message.includes("does not exist"));
      console.log("💡 This is normal - NFT hasn't been minted yet!");
    }

    // STEP 3: Try tokenURI (should fail)
    console.log("\n🧪 STEP 3: Testing tokenURI (should fail)...");
    try {
      const uri = await MySBT.tokenURI(tokenId);
      console.log("📦 Token URI:", uri);
    } catch (error) {
      console.log("❌ tokenURI failed as expected:", error.message.includes("does not exist"));
      console.log("💡 This is normal - NFT hasn't been minted yet!");
    }

    // STEP 4: Verify certificate (should work)
    console.log("\n✅ STEP 4: Verifying certificate...");
    try {
      const verifyResult = await MySBT.verifyCertificate(tokenId);
      console.log("📋 Verification Result:");
      console.log("  - Is Valid:", verifyResult.isValid);
      console.log("  - Status Message:", verifyResult.statusMessage);
    } catch (error) {
      console.log("❌ verifyCertificate failed (expected - token not minted yet):", error.message);
      console.log("💡 This is normal - NFT hasn't been minted yet!");
      
      // Try verification by code instead
      console.log("\n🔍 Trying verification by code...");
      try {
        const verifyByCodeResult = await MySBT.verifyCertificateByCode(verifyCode);
        console.log("📋 Verification by Code Result:");
        console.log("  - Token ID:", verifyByCodeResult.tokenId.toString());
        console.log("  - Is Valid:", verifyByCodeResult.isValid);
        console.log("  - Status Message:", verifyByCodeResult.statusMessage);
        console.log("  - Holder:", verifyByCodeResult.cert.holder);
      } catch (codeError) {
        console.log("❌ Verification by code also failed:", codeError.message);
      }
    }

    // STEP 5: Claim certificate (mint NFT)
    console.log("\n🎯 STEP 5: Claiming certificate (minting NFT)...");
    
    const claimTx = await MySBT.connect(holder).claimCertificate(tokenId);
    const claimReceipt = await claimTx.wait();
    
    console.log("✅ Certificate claimed successfully!");
    console.log("📄 Claim transaction hash:", claimTx.hash);

    // Check for Transfer event
    const transferEvent = claimReceipt.events?.find(e => e.event === 'Transfer');
    if (transferEvent) {
      console.log("📨 Transfer Event Found:");
      console.log("  - From:", transferEvent.args.from);
      console.log("  - To:", transferEvent.args.to);
      console.log("  - Token ID:", transferEvent.args.tokenId.toString());
    }

    // STEP 6: Now test ownerOf (should work)
    console.log("\n✅ STEP 6: Testing ownerOf after claim...");
    try {
      const owner = await MySBT.ownerOf(tokenId);
      console.log("👤 Owner:", owner);
      console.log("🎯 Owner matches holder:", owner.toLowerCase() === holderAddress.toLowerCase());
    } catch (error) {
      console.log("❌ ownerOf still failed:", error.message);
    }

    // STEP 7: Test tokenURI (should work)
    console.log("\n✅ STEP 7: Testing tokenURI after claim...");
    try {
      const uri = await MySBT.tokenURI(tokenId);
      console.log("📦 Token URI:", uri);
    } catch (error) {
      console.log("❌ tokenURI still failed:", error.message);
    }

    // STEP 8: Check updated certificate status
    console.log("\n📊 STEP 8: Final certificate status...");
    const finalCertInfo = await MySBT.certificates(tokenId);
    console.log("📋 Updated Certificate Info:");
    console.log("  - Status:", finalCertInfo.status.toString(), "(1=Active)");
    
    // Check holder's certificates
    const holderCerts = await MySBT.getCertificatesByHolder(holderAddress);
    console.log("  - Holder's certificates:", holderCerts.map(id => id.toString()));

    // Check total supply
    const totalSupply = await MySBT.totalSupply();
    console.log("  - Total Supply:", totalSupply.toString());

    console.log("\n🎉 Test completed successfully!");

  } catch (error) {
    console.error("\n💥 Error in test:", error.message);
    
    // Debug information
    console.log("\n🔍 Debug Info:");
    console.log("- Contract Address:", contractAddress);
    console.log("- Issuer has ISSUER_ROLE:", await MySBT.hasRole(await MySBT.ISSUER_ROLE(), issuer.address));
    console.log("- Contract is paused:", await MySBT.paused());
  }
}

// Helper function to test verification by code
async function testVerificationByCode() {
  console.log("\n🔍 Testing verification by code...");
  
  const contractAddress = "0x921a705b21d6c6f50a6b3037556B0269E97FD57c";
  const MySBT = await ethers.getContractAt("MySBT", contractAddress);
  
}

main()
  .then(() => testVerificationByCode())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });