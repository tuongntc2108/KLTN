// Initialize Course Management System
// Run: node db/init_course_system.js

const fs = require('fs');
const path = require('path');
const db = require("../config/pg");

async function initializeCourseSystem() {
  try {
    console.log("🔄 Initializing Course Management System...");
    
    // Read and execute the SQL file
    const sqlFile = path.join(__dirname, 'add_courses_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL by statements and execute each one
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim().length > 0) {
        console.log(`Executing: ${statement.split('\n')[0].trim()}...`);
        await db.pool.query(statement.trim());
      }
    }
    
    console.log("✅ Course Management System initialized successfully!");
    
    // Check if we have sample data
    const courseCount = await db.pool.query('SELECT COUNT(*) FROM courses');
    console.log(`📊 Current courses in database: ${courseCount.rows[0].count}`);
    
    // Create sample issuer if not exists
    const issuerCheck = await db.pool.query(`
      SELECT id FROM issuers WHERE email = 'tts.tuongntc@vnpay.vn'
    `);
    
    if (issuerCheck.rows.length === 0) {
      console.log("📝 Creating sample issuer...");
      const issuerResult = await db.pool.query(`
        INSERT INTO issuers (name, email, wallet_address, organization, website)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        'VNU Training Center',
        'tts.tuongntc@vnpay.vn',
        '0x4B879e08e8Bbd2517741E9C2b9786764E7fFae9e',
        'Vietnam National University',
        'https://vnu.edu.vn'
      ]);
      
      const issuerId = issuerResult.rows[0].id;
      console.log(`✅ Created issuer with ID: ${issuerId}`);
      
      // Create sample courses if no courses exist
      if (parseInt(courseCount.rows[0].count) === 0) {
        console.log("📚 Creating sample courses...");
        
        const sampleCourses = [
          {
            name: 'Tiếng Anh Giao Tiếp Cấp độ A2',
            description: 'Khóa học tiếng Anh giao tiếp cơ bản dành cho người mới bắt đầu',
            content: `# Khóa học Tiếng Anh Giao Tiếp A2

## Mục tiêu khóa học
- Giao tiếp cơ bản trong các tình huống hàng ngày
- Từ vựng khoảng 1500 từ
- Ngữ pháp cơ bản

## Nội dung chương trình
### Module 1: Giới thiệu bản thân
- Chào hỏi, làm quen
- Nói về sở thích, công việc
- Hỏi đường, chỉ đường

### Module 2: Mua sắm và ăn uống
- Đi siêu thị, nhà hàng
- Đặt món, thanh toán
- Thể hiện sở thích ăn uống

### Module 3: Cuộc sống hàng ngày
- Thói quen sinh hoạt
- Kể về ngày của mình
- Lên kế hoạch

## Đánh giá
- Bài kiểm tra giữa kỳ: 30%
- Bài thi cuối kỳ: 50%
- Tham gia lớp: 20%`,
            duration: '60 giờ (3 tháng)'
          },
          {
            name: 'Tiếng Anh Giao Tiếp Cấp độ B2',
            description: 'Khóa học tiếng Anh giao tiếp trung cấp cho người có nền tảng',
            content: `# Khóa học Tiếng Anh Giao Tiếp B2

## Mục tiêu khóa học
- Giao tiếp tự tin trong môi trường học tập và công việc
- Từ vựng khoảng 3500 từ
- Ngữ pháp nâng cao

## Nội dung chương trình
### Module 1: Thuyết trình và tranh luận
- Kỹ năng thuyết trình
- Bày tỏ quan điểm
- Tranh luận lịch sự

### Module 2: Tiếng Anh thương mại
- Email công việc
- Họp và thảo luận
- Đàm phán cơ bản

### Module 3: Văn hóa và xã hội
- Hiểu biết văn hóa phương Tây
- Thảo luận các chủ đề xã hội
- Phân tích và nhận xét

## Đánh giá
- Thuyết trình: 40%
- Bài thi viết: 35%
- Tham gia thảo luận: 25%`,
            duration: '80 giờ (4 tháng)'
          },
          {
            name: 'Lập trình Python Cơ bản',
            description: 'Khóa học lập trình Python dành cho người mới bắt đầu',
            content: `# Khóa học Lập trình Python Cơ bản

## Mục tiêu khóa học
- Nắm vững cú pháp Python cơ bản
- Xây dựng được chương trình đơn giản
- Hiểu các khái niệm lập trình cơ bản

## Nội dung chương trình
### Module 1: Cơ bản Python
- Cài đặt và cấu hình
- Biến, kiểu dữ liệu
- Toán tử và biểu thức

### Module 2: Cấu trúc điều khiển
- Câu lệnh if-else
- Vòng lặp for, while
- Hàm và module

### Module 3: Cấu trúc dữ liệu
- List, tuple, dictionary
- Set và string methods
- File handling

### Module 4: Dự án thực hành
- Máy tính đơn giản
- Quản lý danh bạ
- Game đoán số

## Đánh giá
- Bài tập hàng tuần: 40%
- Dự án cuối kỳ: 45%
- Tham gia lớp: 15%`,
            duration: '50 giờ (10 tuần)'
          }
        ];
        
        for (const course of sampleCourses) {
          await db.pool.query(`
            INSERT INTO courses (issuer_id, course_name, course_description, training_content, duration)
            VALUES ($1, $2, $3, $4, $5)
          `, [issuerId, course.name, course.description, course.content, course.duration]);
          
          console.log(`  ✅ Created course: ${course.name}`);
        }
        
        console.log("📚 Sample courses created successfully!");
      }
    } else {
      console.log("✅ Issuer already exists");
    }
    
    // Final check
    const finalCourseCount = await db.pool.query('SELECT COUNT(*) FROM courses');
    console.log(`🎯 Total courses after initialization: ${finalCourseCount.rows[0].count}`);
    
    console.log("\n🎉 Course Management System is ready to use!");
    console.log("📝 You can now:");
    console.log("   - Create and manage courses via /dashboard/training/courses");
    console.log("   - Select courses when issuing certificates");
    console.log("   - View course details and certificate counts");
    
  } catch (error) {
    console.error("❌ Error initializing Course Management System:", error.message);
    console.error("Full error:", error);
  } finally {
    process.exit(0);
  }
}

initializeCourseSystem();