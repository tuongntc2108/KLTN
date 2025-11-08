const db = require('./config/pg');

async function checkCurrentWalletStatus() {
  try {
    const email = 'cattuongnguyen2108@gmail.com';
    
    console.log('🔍 Kiểm tra trạng thái ví hiện tại cho email:', email);
    
    // Check student record
    const studentQuery = `
      SELECT id, name, email, wallet_address, created_at 
      FROM students 
      WHERE email = $1
    `;
    
    const result = await db.pool.query(studentQuery, [email]);
    
    if (result.rows.length === 0) {
      console.log('❌ Không tìm thấy student với email:', email);
      return;
    }
    
    const student = result.rows[0];
    console.log('✅ Thông tin student:');
    console.log('  - ID:', student.id);
    console.log('  - Name:', student.name);
    console.log('  - Email:', student.email);
    console.log('  - Wallet Address:', student.wallet_address);
    console.log('  - Created At:', student.created_at);
    console.log('  - Has Wallet:', !!student.wallet_address);
    
    if (student.wallet_address) {
      console.log('\n🔍 Kiểm tra certificates cho wallet này...');
      
      // Check certificates for this wallet
      const certQuery = `
        SELECT token_id, certificate_name, status, holder, issued_date
        FROM certificates 
        WHERE holder = $1
        ORDER BY issued_date DESC
        LIMIT 5
      `;
      
      const certResult = await db.pool.query(certQuery, [student.wallet_address]);
      
      if (certResult.rows.length > 0) {
        console.log(`✅ Tìm thấy ${certResult.rows.length} certificates:`);
        certResult.rows.forEach((cert, index) => {
          console.log(`  ${index + 1}. Token ID: ${cert.token_id}`);
          console.log(`     Name: ${cert.certificate_name}`);
          console.log(`     Status: ${cert.status}`);
          console.log(`     Issued: ${cert.issued_date}`);
          console.log('     ---');
        });
      } else {
        console.log('ℹ️ Chưa có certificates nào cho wallet này');
      }
    } else {
      console.log('\n⚠️ Student chưa có wallet address');
    }
    
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra trạng thái ví:', error);
  } finally {
    process.exit(0);
  }
}

checkCurrentWalletStatus();