const express = require("express");
const app = express();
require("dotenv").config();
const db = require("./config/pg");
db.pool.on("connect", () => console.log("✅ PostgreSQL connected"));

// Middleware parse JSON (quan trọng: phải trước routes)
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

const certificateRoutes = require("./routes/certificateRoutes");
app.use("/api/certificates", certificateRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend chạy trên cổng ${PORT}`);
});
