# Deploy Smart Contract MySBT - Phiên bản cải tiến

## Tổng quan
Smart contract MySBT đã được cải tiến để giải quyết vấn đề chứng chỉ chưa claim có thể truy cập được.

## Các thay đổi chính

### 1. **Sửa function `tokenURI`:**
```solidity
// Trước (có vấn đề)
require(_ownerOf(tokenId) != address(0), "Token does not exist");

// Sau (đã sửa)
require(certificateExists(tokenId), "Certificate does not exist");
```

### 2. **Thêm function `certificateExists`:**
```solidity
function certificateExists(uint256 tokenId) public view returns (bool) {
    return certificates[tokenId].holder != address(0);
}
```

### 3. **Thêm function `getCertificate`:**
```solidity
function getCertificate(uint256 tokenId) public view returns (Certificate memory) {
    require(certificateExists(tokenId), "Certificate does not exist");
    return certificates[tokenId];
}
```

### 4. **Thêm function `getActualOwner`:**
```solidity
function getActualOwner(uint256 tokenId) public view returns (address) {
    if (!certificateExists(tokenId)) {
        return address(0);
    }
    
    address nftOwner = super._ownerOf(tokenId);
    if (nftOwner != address(0)) {
        return nftOwner; // NFT đã mint
    } else {
        return address(0); // Chưa mint, không ai sở hữu
    }
}
```

### 5. **Thêm function `getClaimableHolder`:**
```solidity
function getClaimableHolder(uint256 tokenId) public view returns (address) {
    if (!certificateExists(tokenId)) {
        return address(0);
    }
    
    address nftOwner = super._ownerOf(tokenId);
    if (nftOwner == address(0)) {
        return certificates[tokenId].holder; // Có thể claim
    } else {
        return address(0); // Đã mint, không thể claim
    }
}
```

## Lợi ích của phiên bản mới

✅ **Giải quyết vấn đề chính**: Chứng chỉ chưa claim có thể truy cập được  
✅ **Tuân thủ ERC-721**: Không override logic ownership gốc  
✅ **Function rõ ràng**: Phân biệt rõ ownership vs claimability  
✅ **Backward compatible**: Tất cả function cũ vẫn hoạt động  
✅ **Performance tốt**: Không cần logic phức tạp trong backend  

## Cách deploy

### 1. **Compile smart contract:**
```bash
cd SmartContract
npx hardhat compile
```

### 2. **Deploy lên testnet:**
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 3. **Cập nhật biến môi trường:**
```bash
# Trong file .env của Backend
CONTRACT_ADDRESS=0xNewContractAddress
```

### 4. **Test smart contract:**
```bash
# Test function mới
npx hardhat console --network sepolia

# Ví dụ test
const contract = await ethers.getContractAt("MySBT", "0xContractAddress");

# Kiểm tra certificate có tồn tại không (cách 1)
try {
  const cert = await contract.getCertificate(1);
  console.log("Certificate exists:", true);
} catch (error) {
  console.log("Certificate exists:", false);
}

# Kiểm tra certificate có tồn tại không (cách 2)
const total = await contract.totalSupply();
console.log("Total certificates:", total.toString());

# Lấy thông tin certificate (sẽ lỗi nếu không tồn tại)
await contract.getCertificate(1);

# Kiểm tra owner thực tế của NFT
await contract.getActualOwner(1);

# Kiểm tra ai có thể claim certificate
await contract.getClaimableHolder(1);

# Lấy tổng số certificate đã tạo
await contract.totalSupply();

# Kiểm tra role của address
await contract.hasRole(await contract.ISSUER_ROLE(), "0xYourAddress");
```

**Hoặc sử dụng script test tự động:**
```bash
# Chạy script test (nhớ cập nhật địa chỉ contract trong file)
npx hardhat run scripts/test-functions.js --network sepolia
```

## So sánh trước và sau

| Function | Trước (Có vấn đề) | Sau (Đã sửa) |
|----------|-------------------|---------------|
| `tokenURI(1)` | ❌ "Token does not exist" | ✅ Trả về metadata URI |
| `ownerOf(1)` | ❌ `address(0)` | ✅ Trả về owner thực tế |
| `certificateExists(1)` | ❌ Không có | ✅ Kiểm tra certificate |
| `getCertificate(1)` | ❌ Không có | ✅ Lấy thông tin certificate |
| `getActualOwner(1)` | ❌ Không có | ✅ Lấy owner thực tế |
| `getClaimableHolder(1)` | ❌ Không có | ✅ Lấy holder có thể claim |

## Lưu ý quan trọng

1. **Deploy mới**: Cần deploy lại smart contract với code mới
2. **Cập nhật address**: Backend cần cập nhật `CONTRACT_ADDRESS` mới
3. **Test kỹ**: Test tất cả function trước khi sử dụng production
4. **Migration**: Nếu có dữ liệu cũ, cần migrate sang contract mới

## Troubleshooting

### **Lỗi thường gặp:**
1. **"Contract not found"**: Kiểm tra address contract mới
2. **"Function not found"**: Đảm bảo đã deploy contract mới
3. **"Gas limit exceeded"**: Tăng gas limit khi deploy

### **Kiểm tra deploy:**
```bash
# Kiểm tra contract trên blockchain explorer
# Sepolia: https://sepolia.etherscan.io/address/0xContractAddress

# Kiểm tra ABI và bytecode
npx hardhat verify --network sepolia 0xContractAddress
```


