// server.js
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const db = require("./config/pg");
const { main: syncMain } = require("./services/sync");

// Test kết nối PostgreSQL ngay khi server start
db.pool.connect()
  .then(client => {
    console.log("✅ PostgreSQL connected");
    client.release(); // Trả connection lại pool
  })
  .catch(err => {
    console.error("❌ PostgreSQL connection error:", err);
    process.exit(1); // Dừng server nếu không kết nối được DB
  });

// CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

// Middleware parse JSON
app.use(express.json());

// Fake auth (sau khi parse JSON mới thêm user)
app.use((req, res, next) => {
  req.user = {
    email: "22021207@vnu.edu.vn",
    walletAddress: process.env.STUDENT_WALLET,
    fullName: "Nguyen Van A"
  };
  next();
});

// Routes
const certificateRoutes = require("./routes/certificateRoutes");
app.use("/api/certificates", certificateRoutes);

const verifyRoutes = require("./routes/verifyRoutes");
app.use("/api/verify", verifyRoutes);

const studentRoutes = require("./routes/studentRoutes");
app.use("/api/students", studentRoutes);

// Auto-sync configuration
const SYNC_INTERVAL = process.env.SYNC_INTERVAL || 5 * 60 * 1000; // 5 phút mặc định
let syncInterval;

// Function để start auto-sync
function startAutoSync() {
  console.log(`🔄 Starting auto-sync every ${SYNC_INTERVAL / 1000} seconds`);
  
  // Chạy sync ngay lập tức khi server start
  runSync();
  
  // Sau đó chạy định kỳ
  syncInterval = setInterval(runSync, SYNC_INTERVAL);
}

// Function để chạy sync
async function runSync() {
  try {
    console.log(`🔄 [${new Date().toISOString()}] Starting auto-sync...`);
    await syncMain();
    console.log(`✅ [${new Date().toISOString()}] Auto-sync completed successfully`);
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Auto-sync failed:`, error.message);
  }
}

// Function để stop auto-sync
function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    console.log('🛑 Auto-sync stopped');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  stopAutoSync();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  stopAutoSync();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend chạy trên cổng ${PORT}`);
  
  // Start auto-sync sau khi server đã sẵn sàng
  startAutoSync();
});
