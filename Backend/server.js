// server.js
const express = require("express");
const app = express();
require("dotenv").config();
const db = require("./config/pg");

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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend chạy trên cổng ${PORT}`);
});
