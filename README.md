# KLTN - Hệ Thống Chứng Chỉ Số SBT

Tài liệu này hướng dẫn chi tiết để một người mới có thể clone và chạy dự án từ đầu.

## 1) Tổng quan hệ thống

Dự án gồm 4 phần chính:

- Backend: API server Node.js/Express + PostgreSQL + AI/RAG.
- Frontend: Next.js (React) giao diện người dùng.
- SmartContract: Hardhat + Solidity để deploy/chạy hợp đồng SBT.
- n8n: workflow automation (gửi webhook/thông báo).

## 2) Cấu trúc thư mục

Sau khi clone, cấu trúc chính:

- `src/Backend`
- `src/Frontend`
- `src/SmartContract`
- `src/n8n`

## 3) Yêu cầu cài đặt trước

Cần cài đặt trước các thành phần sau:

- Node.js: khuyến nghị 20.x.
- npm: đi kèm Node.js.
- PostgreSQL: 14+.
- Git.
- Docker Desktop: nếu chạy n8n bằng Docker.

Kiểm tra nhanh:

```bash
node -v
npm -v
psql --version
docker --version
```

## 4) Clone dự án

```bash
git clone <YOUR_REPO_URL>
cd KLTN
```

Nếu bạn clone vào thư mục khác thì thay `KLTN` bằng tên thư mục tương ứng.

## 5) Chạy Backend (bắt buộc)

### Bước 5.1: Cài dependencies Backend

```bash
cd src/Backend
npm install
```

### Bước 5.2: Tạo file `.env` cho Backend

Tạo file: `src/Backend/.env`

Nội dung mẫu:

```env
# App
NODE_ENV=development
PORT=4000
BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
SYNC_INTERVAL=300000
START_BLOCK=0

# PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/kltn

# Blockchain
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=0xYourContractAddress

# Google OAuth (nếu dùng login Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI
OPENAI_API_KEY=your_openai_api_key

# Pinata/IPFS
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key

# n8n webhook (nếu dùng)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/your-webhook
N8N_WEBHOOK_URL_SUPPORT=http://localhost:5678/webhook/your-support-webhook
```

### Bước 5.3: Tạo database và schema

Tạo DB (ví dụ tên `kltn`):

```bash
createdb kltn
```

Import schema:

```bash
psql -U postgres -d kltn -f db/schema.sql
```

Nếu máy bạn không nhận `createdb`/`psql`, mở SQL Shell hoặc pgAdmin và tạo DB thủ công, sau đó chạy file `src/Backend/db/schema.sql`.

### Bước 5.4: Chạy Backend

```bash
npm run dev
```

Hoặc:

```bash
node server.js
```

Backend mặc định chạy tại: `http://localhost:4000`

## 6) Chạy Frontend

Mở terminal mới:

```bash
cd src/Frontend
npm install
```

Tạo file: `src/Frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_CHAT_API_URL=http://localhost:4000/api/chat
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress

# Chỉ cần nếu bạn dùng NextAuth trên frontend
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Chạy frontend:

```bash
npm run dev
```

Frontend mặc định chạy tại: `http://localhost:3000`

## 7) Chạy Smart Contract (tùy chọn nhưng rất quan trọng)

Mở terminal mới:

```bash
cd src/SmartContract
npm install
```

Tạo file: `src/SmartContract/.env`

```env
RPC_URL=http://127.0.0.1:8545
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_key
CONTRACT_ADDRESS=0xYourContractAddress
```

Compile contract:

```bash
npx hardhat compile
```

Chạy test:

```bash
npx hardhat test
```

Deploy local:

Terminal 1:

```bash
npx hardhat node
```

Terminal 2:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Deploy sepolia:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Sau deploy, copy địa chỉ contract vào:

- `src/Backend/.env` -> `CONTRACT_ADDRESS`
- `src/Frontend/.env.local` -> `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `src/SmartContract/.env` -> `CONTRACT_ADDRESS`

## 8) Chạy n8n (tùy chọn)

Mở terminal mới:

```bash
cd src/n8n
docker compose up -d
```

Truy cập: `http://localhost:5678`

Thông tin đăng nhập mặc định trong file compose:

- user: `admin`
- pass: `admin2108`

## 9) Thứ tự chạy khuyến nghị cho local dev

1. Chạy PostgreSQL.
2. Chạy Backend (`src/Backend`).
3. Chạy Frontend (`src/Frontend`).
4. Nếu cần blockchain local thì chạy Hardhat node + deploy contract.
5. Nếu cần workflow thì chạy n8n.

## 10) Cách kiểm tra hệ thống đã lên

- Frontend: mở `http://localhost:3000`.
- Backend: gọi `http://localhost:4000` (hoặc endpoint API).
- Đăng nhập/đi đến trang dashboard để xác nhận API hoạt động.

## 11) Lỗi thường gặp và cách xử lý

### Lỗi: `Cannot find module 'dotenv'`

Nguyên nhân: chưa cài dependencies trong đúng thư mục backend.

Cách sửa:

```bash
cd src/Backend
npm install
node server.js
```

### Lỗi: không kết nối được PostgreSQL

Kiểm tra:

- PostgreSQL đã chạy chưa.
- `DATABASE_URL` đúng user/password/host/port/db chưa.
- Đã import `db/schema.sql` chưa.

### Lỗi: contract/ABI không tìm thấy

Kiểm tra:

- Đã `npx hardhat compile` trong `src/SmartContract` chưa.
- `CONTRACT_ADDRESS` trong `.env` đã đúng chưa.

### Lỗi CORS/Login Google

Kiểm tra:

- `FRONTEND_URL`, `BACKEND_URL` đúng port.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` hợp lệ.
- Redirect URI trong Google Console đã cấu hình đúng.

## 12) Lệnh nhanh theo từng thư mục

### Backend

```bash
cd src/Backend
npm install
npm run dev
```

### Frontend

```bash
cd src/Frontend
npm install
npm run dev
```

### SmartContract

```bash
cd src/SmartContract
npm install
npx hardhat compile
```

### n8n

```bash
cd src/n8n
docker compose up -d
```

## 13) Ghi chú bảo mật

Không commit các file sau lên git:

- `.env`
- `.env.local`
- private key, API key, secret

Nếu nghi lộ key, hãy rotate key ngay lập tức.

## 14) Nếu muốn reset môi trường nhanh

Trong từng module (`Backend`, `Frontend`, `SmartContract`):

```bash
rm -rf node_modules package-lock.json
npm install
```

Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```
