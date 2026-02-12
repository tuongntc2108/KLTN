// server.js
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware parse JSON
app.use(express.json());
app.use(cookieParser());

// Fake auth (commented out - now using real OAuth)
// app.use((req, res, next) => {
//   req.user = {
//     email: "22021207@vnu.edu.vn",
//     walletAddress: process.env.STUDENT_WALLET,
//     fullName: "Nguyen Van A"
//   };
//   next();
// });

// Routes
const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

const certificateRoutes = require("./routes/certificateRoutes");
app.use("/api/certificates", certificateRoutes);

const verifyRoutes = require("./routes/verifyRoutes");
app.use("/api/verify", verifyRoutes);

const studentRoutes = require("./routes/studentRoutes");
app.use("/api/students", studentRoutes);

const courseRoutes = require("./routes/courseRoutes");
app.use("/api/courses", courseRoutes);

const dashboardRoutes = require("./routes/dashboardRoutes");
app.use("/api/dashboard", dashboardRoutes);

const documentRoutes = require("./routes/documentRoutes");
app.use("/api/documents", documentRoutes);

const issuerRoutes = require("./routes/issuerRoutes");
app.use("/api/issuers", issuerRoutes);

// New LangChain RAG chat API mounted at /api/chat
const chatRoutes = require("./routes/chat");
app.use("/api/chat", chatRoutes);

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
