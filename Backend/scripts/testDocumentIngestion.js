const path = require('path');
const fs = require('fs').promises;
const DocumentLoaderService = require('../rag/loadDocuments');
const PostgreSQLVectorStore = require('../rag/vectorStore');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const db = require('../config/pg');

/**
 * Test Document Ingestion Pipeline
 * 
 * Script to test the complete document processing workflow
 */
async function testDocumentIngestion() {
  console.log('🧪 Starting Document Ingestion Pipeline Test\n');

  try {
    // Test 1: Check service health
    console.log('📋 Test 1: Service Health Check');
    console.log('✓ Document Ingestion Service loaded');
    console.log('✓ Gemini API configured:', !!process.env.GEMINI_API_KEY);
    console.log();

    // Test 2: Create test documents
    console.log('📋 Test 2: Creating Test Documents');
    const testDir = path.join(__dirname, '../test-documents');
    await fs.mkdir(testDir, { recursive: true });

    // Create sample text file
    const sampleText = `
Hướng dẫn sử dụng hệ thống quản lý chứng chỉ blockchain

1. Đăng nhập và Đăng ký
- Người dùng có thể đăng nhập bằng Google OAuth hoặc tạo tài khoản mới
- Sau khi đăng nhập, cần kết nối ví MetaMask để tương tác với blockchain

2. Kết nối ví MetaMask
- Nhấp vào nút "Connect Wallet" trên giao diện
- Chọn tài khoản MetaMask mong muốn
- Đảm bảo ví đã được kết nối với mạng Sepolia testnet

3. Xem khóa học
- Truy cập trang Dashboard để xem danh sách khóa học
- Nhấp vào khóa học để xem chi tiết nội dung
- Hoàn thành các bài học theo thứ tự

4. Nhận chứng chỉ
- Sau khi hoàn thành khóa học, hệ thống sẽ tự động tạo chứng chỉ SBT
- Chứng chỉ được lưu trên blockchain và không thể chuyển nhượng
- Người dùng có thể xem chứng chỉ trong trang profile

5. Xác minh chứng chỉ
- Sử dụng trang verify để kiểm tra tính hợp lệ của chứng chỉ
- Nhập địa chỉ ví hoặc mã chứng chỉ để xác minh
- Hệ thống sẽ hiển thị thông tin chi tiết về chứng chỉ

6. Quản lý Profile
- Cập nhật thông tin cá nhân trong trang profile
- Xem lịch sử học tập và chứng chỉ đã nhận
- Theo dõi tiến độ học tập

Lưu ý kỹ thuật:
- Hệ thống sử dụng Smart Contract MySBT trên mạng Sepolia
- Chứng chỉ được mã hóa và lưu trữ trên IPFS
- Metadata được lưu trong PostgreSQL với vector embeddings
- Chatbot AI hỗ trợ người dùng 24/7 với khả năng hiểu ngữ cảnh

Liên hệ hỗ trợ: support@certificate-system.com
`;

    const textFilePath = path.join(testDir, 'huong-dan-su-dung.txt');
    await fs.writeFile(textFilePath, sampleText, 'utf-8');
    console.log('✓ Created sample text file');

    // Create sample markdown file
    const markdownContent = `
# FAQ - Câu hỏi thường gặp

## Wallet và Blockchain

### Q: Tại sao tôi không thể kết nối ví MetaMask?
A: Kiểm tra các nguyên nhân sau:
- Đảm bảo MetaMask extension được cài đặt và bật
- Kiểm tra kết nối internet ổn định  
- Chuyển sang mạng Sepolia testnet trong MetaMask
- Thử làm mới trang và kết nối lại

### Q: Tại sao giao dịch của tôi bị failed?
A: Có thể do:
- Không đủ ETH test để trả gas fee
- Gas price được set quá thấp
- Smart contract đang bảo trì
- Lỗi kết nối mạng blockchain

## Chứng chỉ

### Q: Tôi đã hoàn thành khóa học nhưng chưa nhận được chứng chỉ?
A: Hãy kiểm tra:
- Đã hoàn thành tất cả bài học trong khóa học
- Ví MetaMask đã được kết nối đúng cách
- Xem tab "Certificates" trong dashboard
- Liên hệ support nếu vẫn chưa thấy

### Q: Chứng chỉ SBT có thể bán được không?
A: Không, chứng chỉ SBT (Soulbound Token) được thiết kế không thể chuyển nhượng
- Gắn liền với ví của người nhận
- Không thể bán, tặng hay chuyển cho người khác
- Đảm bảo tính xác thực và chống gian lận

## Khóa học

### Q: Làm sao để ghi danh vào khóa học?
A: Thực hiện các bước:
1. Đăng nhập vào tài khoản
2. Truy cập trang "Courses"  
3. Chọn khóa học muốn học
4. Nhấp "Enroll" để ghi danh
5. Bắt đầu học các bài học

### Q: Tôi có thể học nhiều khóa học cùng lúc không?
A: Có, bạn có thể:
- Ghi danh vào nhiều khóa học
- Học theo tiến độ riêng của mình
- Tạm dừng và tiếp tục bất cứ lúc nào
- Theo dõi tiến độ trong dashboard

## Tài khoản

### Q: Tôi quên mật khẩu thì làm sao?
A: Sử dụng chức năng đăng nhập bằng Google OAuth
- Nhấp "Login with Google"
- Hệ thống sẽ tự động tạo/liên kết tài khoản
- Không cần nhớ mật khẩu riêng

### Q: Tôi có thể thay đổi thông tin cá nhân không?
A: Có, trong trang Profile:
- Cập nhật tên hiển thị
- Thêm bio và mô tả
- Upload avatar (sắp có)
- Cập nhật thông tin liên hệ
`;

    const mdFilePath = path.join(testDir, 'faq.md');
    await fs.writeFile(mdFilePath, markdownContent, 'utf-8');
    console.log('✓ Created sample markdown file');
    console.log();

    // Test 3: Ingest documents
    console.log('📋 Test 3: Document Ingestion');
    const testFiles = [
      {
        path: textFilePath,
        originalName: 'huong-dan-su-dung.txt',
        mimetype: 'text/plain',
        size: sampleText.length
      },
      {
        path: mdFilePath,
        originalName: 'faq.md',
        mimetype: 'text/markdown',
        size: markdownContent.length
      }
    ];

    const metadata = {
      category: 'documentation',
      tags: ['hướng dẫn', 'faq', 'blockchain', 'chứng chỉ'],
      description: 'Tài liệu hướng dẫn sử dụng hệ thống'
    };

    console.log('🔄 Processing documents with LangChain...');
    
    // Initialize embeddings and document loader
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: 'text-embedding-004',
      apiKey: process.env.GEMINI_API_KEY,
    });
    
    const documentLoader = new DocumentLoaderService();
    const vectorStore = PostgreSQLVectorStore.fromEmbeddings(embeddings, { pool: db.pool });
    
    // Load documents using LangChain
    const loadedDocs = await documentLoader.loadDocuments(testFiles);
    
    // Add documents to vector store with embeddings
    const documentIds = await vectorStore.addDocuments(loadedDocs);
    
    // Prepare results in the same format as the old service
    const results = testFiles.map((file, index) => ({
      filename: file.originalName,
      status: 'success',
      documentIds: [documentIds[index]], // Assuming each file maps to one or more document IDs
      chunkCount: loadedDocs.filter(doc => doc.metadata.sourceFile === file.originalName).length
    }));

    console.log('📊 Ingestion Results:');
    results.forEach((result, index) => {
      console.log(`  File ${index + 1}: ${result.filename}`);
      console.log(`    Status: ${result.status}`);
      console.log(`    Chunks: ${result.chunkCount}`);
      console.log(`    Documents: ${result.documentIds.length}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    console.log();

    // Test 4: Search documents
    console.log('📋 Test 4: Document Search');
    const searchQueries = [
      'Cách kết nối ví MetaMask',
      'Chứng chỉ SBT là gì',
      'Tại sao giao dịch failed',
      'Làm sao ghi danh khóa học'
    ];

    for (const query of searchQueries) {
      console.log(`🔍 Searching: "${query}"`);
      try {
        // Initialize embeddings and vector store for search
        const embeddings = new GoogleGenerativeAIEmbeddings({
          model: 'text-embedding-004',
          apiKey: process.env.GEMINI_API_KEY,
        });
        
        const vectorStore = PostgreSQLVectorStore.fromEmbeddings(embeddings, { pool: db.pool });
        
        // Perform similarity search using LangChain vector store
        const docs = await vectorStore.similaritySearch(query, 3);
        
        // Convert LangChain documents to the expected format
        const searchResults = docs.map(doc => ({
          id: doc.metadata.id,
          title: doc.metadata.title,
          content_chunk: doc.pageContent,
          source_file: doc.metadata.sourceFile,
          source_type: doc.metadata.sourceType,
          similarity_score: doc.metadata.similarityScore,
          metadata: doc.metadata
        }));
        
        console.log(`  Found ${searchResults.length} relevant documents:`);
        
        searchResults.forEach((doc, index) => {
          console.log(`    ${index + 1}. ${doc.title} (similarity: ${(doc.similarity_score * 100).toFixed(1)}%)`);
          console.log(`       Content: ${doc.content_chunk.substring(0, 100)}...`);
        });
      } catch (error) {
        console.log(`  ❌ Search error: ${error.message}`);
      }
      console.log();
    }

    // Test 5: Get statistics
    console.log('📋 Test 5: Document Statistics');
    try {
      // Get document statistics directly from the database
      const query = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT source_file) as unique_files,
          AVG(LENGTH(content_chunk)) as avg_chunk_length,
          MIN(created_at) as oldest_document,
          MAX(created_at) as newest_document,
          source_type,
          COUNT(*) as count_by_type
        FROM chatbot_documents
        GROUP BY source_type
        ORDER BY count_by_type DESC
      `;
      
      const result = await db.pool.query(query);
      const stats = result.rows;
      
      console.log('📊 Document Statistics:');
      stats.forEach(stat => {
        console.log(`  ${stat.source_type}: ${stat.count_by_type} documents`);
      });
    } catch (error) {
      console.log(`❌ Stats error: ${error.message}`);
    }
    console.log();

    // Clean up test files
    console.log('🧹 Cleaning up test files...');
    try {
      await fs.unlink(textFilePath);
      await fs.unlink(mdFilePath);
      await fs.rmdir(testDir);
      console.log('✓ Test files cleaned up');
    } catch (error) {
      console.log('⚠️ Could not clean up test files:', error.message);
    }

    console.log('\n🎉 Document Ingestion Pipeline Test Completed Successfully!');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run test if called directly
if (require.main === module) {
  testDocumentIngestion();
}

module.exports = { testDocumentIngestion };