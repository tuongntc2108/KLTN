// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MySBT
 * @dev Soulbound Token contract for digital certificates
 * Implements ERC-721 but prevents transfers (Soulbound)
 */
contract MySBT is ERC721, AccessControl, Pausable {
    // Counter for token IDs (thay thế Counters)
    uint256 private _nextTokenId = 1;
    
    // Role definitions
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Certificate status enumeration
    enum CertificateStatus {
        Issued,         // Đã cấp nhưng chưa claim
        Active,         // Đã claim và đang hoạt động
        Expired,        // Đã hết hạn
        Revoked,        // Đã thu hồi
        Replaced        // Đã được thay thế
    }
    
    // Certificate metadata structure
    struct Certificate {
        string metadataURI;      // IPFS URI chứa metadata JSON
        address holder;          // Địa chỉ người nhận
        address issuer;          // Địa chỉ người cấp
        uint256 issuedDate;      // Thời gian cấp
        uint256 expireDate;      // Thời gian hết hạn
        CertificateStatus status; // Trạng thái chứng chỉ
        string courseId;         // Mã khóa học từ metadata
        string verificationCode; // Mã xác thực từ metadata
        bytes32 dataHash;        // Hash dữ liệu off-chain (privacy-preserving)
    }
    
    // State variables  
    mapping(uint256 => Certificate) public certificates;
    mapping(string => uint256) public verificationCodeToToken;
    mapping(address => uint256[]) public holderCertificates;
    mapping(address => uint256[]) public issuerCertificates;
    
    // Events
    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed holder,
        address indexed issuer,
        string verificationCode,
        string metadataURI
    );
    
    event CertificateClaimed(
        uint256 indexed tokenId,
        address indexed holder
    );
    
    event CertificateRevoked(
        uint256 indexed tokenId,
        address indexed issuer,
        string reason
    );
    
    event CertificateExpired(
        uint256 indexed tokenId
    );
    
    event CertificateReplaced(
        uint256 indexed oldTokenId,
        uint256 indexed newTokenId
    );
    
    // Constructor
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // Modifiers
    modifier onlyIssuer() {
        require(hasRole(ISSUER_ROLE, msg.sender), "Caller is not an issuer");
        _;
    }
    
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _;
    }
    
    modifier tokenExists(uint256 tokenId) {
        require(certificateExists(tokenId), "Certificate does not exist");
        _;
    }
    
    // Issue new certificate
    function issueCertificate(
        address holder,
        string memory metadataURI,
        uint256 expireDate,
        string memory courseId,
        string memory verificationCode,
        bytes32 dataHash
    ) external onlyIssuer whenNotPaused returns (uint256) {
        require(holder != address(0), "Invalid holder address");
        require(bytes(verificationCode).length > 0, "Verification code required");
        require(verificationCodeToToken[verificationCode] == 0, "Verification code already exists");
        require(expireDate > block.timestamp, "Expire date must be in future");
        
        uint256 newTokenId = _nextTokenId++;
        
        // Create certificate
        certificates[newTokenId] = Certificate({
            metadataURI: metadataURI,
            holder: holder,
            issuer: msg.sender,
            issuedDate: block.timestamp,
            expireDate: expireDate,
            status: CertificateStatus.Issued,
            courseId: courseId,
            verificationCode: verificationCode,
            dataHash: dataHash
        });
        
        // Map verification code to token
        verificationCodeToToken[verificationCode] = newTokenId;
        
        // Add to issuer's certificates
        issuerCertificates[msg.sender].push(newTokenId);
        
        emit CertificateIssued(newTokenId, holder, msg.sender, verificationCode, metadataURI);
        
        return newTokenId;
    }
    
    // Claim certificate by holder
    function claimCertificate(uint256 tokenId) external whenNotPaused {
        Certificate storage cert = certificates[tokenId];
        require(cert.holder != address(0), "Certificate does not exist");
        require(cert.holder == msg.sender, "Not the designated holder");
        require(cert.status == CertificateStatus.Issued, "Certificate not available for claiming");
        require(block.timestamp <= cert.expireDate, "Certificate expired");
        
        // Mint NFT to holder
        _mint(msg.sender, tokenId);
        
        // Update status and add to holder's certificates
        cert.status = CertificateStatus.Active;
        holderCertificates[msg.sender].push(tokenId);
        
        emit CertificateClaimed(tokenId, msg.sender);
    }
    
    // Revoke certificate
    function revokeCertificate(uint256 tokenId, string memory reason) 
        external 
        onlyIssuer 
        tokenExists(tokenId) 
        whenNotPaused 
    {
        Certificate storage cert = certificates[tokenId];
        require(cert.issuer == msg.sender, "Not the issuer of this certificate");
        require(cert.status == CertificateStatus.Active || cert.status == CertificateStatus.Issued, 
                "Certificate cannot be revoked");
        
        cert.status = CertificateStatus.Revoked;
        
        emit CertificateRevoked(tokenId, msg.sender, reason);
    }
    
    // Replace certificate with new one
    function replaceCertificate(
        uint256 oldTokenId,
        address holder,
        string memory metadataURI,
        uint256 expireDate,
        string memory courseId,
        string memory verificationCode,
        bytes32 dataHash
    ) external onlyIssuer tokenExists(oldTokenId) whenNotPaused returns (uint256) {
        Certificate storage oldCert = certificates[oldTokenId];
        require(oldCert.issuer == msg.sender, "Not the issuer of this certificate");
        
        // Mark old certificate as replaced
        oldCert.status = CertificateStatus.Replaced;
        
        // Issue new certificate manually (avoid recursive call)
        require(holder != address(0), "Invalid holder address");
        require(bytes(verificationCode).length > 0, "Verification code required");
        require(verificationCodeToToken[verificationCode] == 0, "Verification code already exists");
        require(expireDate > block.timestamp, "Expire date must be in future");
        
        uint256 newTokenId = _nextTokenId++;
        
        // Create new certificate
        certificates[newTokenId] = Certificate({
            metadataURI: metadataURI,
            holder: holder,
            issuer: msg.sender,
            issuedDate: block.timestamp,
            expireDate: expireDate,
            status: CertificateStatus.Issued,
            courseId: courseId,
            verificationCode: verificationCode,
            dataHash: dataHash
        });
        
        // Map verification code to token
        verificationCodeToToken[verificationCode] = newTokenId;
        
        // Add to issuer's certificates
        issuerCertificates[msg.sender].push(newTokenId);
        
        emit CertificateIssued(newTokenId, holder, msg.sender, verificationCode, metadataURI);
        emit CertificateReplaced(oldTokenId, newTokenId);
        
        return newTokenId;
    }
    
    // Verify certificate by token ID
    function verifyCertificate(uint256 tokenId) 
        external 
        tokenExists(tokenId) 
        returns (
            Certificate memory cert,
            bool isValid,
            string memory statusMessage
        ) 
    {
        cert = certificates[tokenId];
        
        // Auto-update expired status if needed
        if (block.timestamp > cert.expireDate && 
            (cert.status == CertificateStatus.Active || cert.status == CertificateStatus.Issued)) {
            certificates[tokenId].status = CertificateStatus.Expired;
            emit CertificateExpired(tokenId);
            cert = certificates[tokenId]; // Update local copy
        }
        
        if (cert.status == CertificateStatus.Revoked) {
            return (cert, false, "Certificate has been revoked");
        } else if (cert.status == CertificateStatus.Replaced) {
            return (cert, false, "Certificate has been replaced");
        } else if (cert.status == CertificateStatus.Expired) {
            return (cert, false, "Certificate has expired");
        } else if (cert.status == CertificateStatus.Issued) {
            return (cert, true, "Certificate issued but not yet claimed");
        } else {
            return (cert, true, "Certificate is valid and active");
        }
    }
    
    // Verify certificate by verification code
    function verifyCertificateByCode(string memory verificationCode) 
        external 
        returns (
            Certificate memory cert,
            bool isValid,
            string memory statusMessage,
            uint256 tokenId
        ) 
    {
        tokenId = verificationCodeToToken[verificationCode];
        require(tokenId != 0, "Invalid verification code");
        
        cert = certificates[tokenId];
        
        // Auto-update expired status if needed
        if (block.timestamp > cert.expireDate && 
            (cert.status == CertificateStatus.Active || cert.status == CertificateStatus.Issued)) {
            certificates[tokenId].status = CertificateStatus.Expired;
            emit CertificateExpired(tokenId);
            cert = certificates[tokenId]; // Update local copy
        }
        
        if (cert.status == CertificateStatus.Revoked) {
            return (cert, false, "Certificate has been revoked", tokenId);
        } else if (cert.status == CertificateStatus.Replaced) {
            return (cert, false, "Certificate has been replaced", tokenId);
        } else if (cert.status == CertificateStatus.Expired) {
            return (cert, false, "Certificate has expired", tokenId);
        } else if (cert.status == CertificateStatus.Issued) {
            return (cert, true, "Certificate issued but not yet claimed", tokenId);
        } else {
            return (cert, true, "Certificate is valid and active", tokenId);
        }
    }
    
    // Get certificates by holder
    function getCertificatesByHolder(address holder) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return holderCertificates[holder];
    }
    
    // Get certificates by issuer
    function getCertificatesByIssuer(address issuer) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return issuerCertificates[issuer];
    }
    
    // Check if certificate is expired and update status
    function updateExpiredStatus(uint256 tokenId) external tokenExists(tokenId) {
        Certificate storage cert = certificates[tokenId];
        if (block.timestamp > cert.expireDate && 
            (cert.status == CertificateStatus.Active || cert.status == CertificateStatus.Issued)) {
            cert.status = CertificateStatus.Expired;
            emit CertificateExpired(tokenId);
        }
    }
    
    // Admin functions
    function addIssuer(address issuer) external onlyAdmin {
        grantRole(ISSUER_ROLE, issuer);
    }
    
    function removeIssuer(address issuer) external onlyAdmin {
        revokeRole(ISSUER_ROLE, issuer);
    }
    
    function pause() external onlyAdmin {
        _pause();
    }
    
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    // Override tokenURI to return IPFS metadata
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        require(certificateExists(tokenId), "Certificate does not exist");
        return certificates[tokenId].metadataURI;
    }
    
    // Soulbound: Override _update to prevent transfers
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override 
        returns (address) 
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from address(0)) but prevent transfers
        require(from == address(0), "Soulbound: Transfer not allowed");
        
        return super._update(to, tokenId, auth);
    }
    
    // Override approve functions to prevent approvals
    function approve(address, uint256) public pure override {
        revert("Soulbound: Approval not allowed");
    }
    
    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound: Approval not allowed");
    }
    
    function getApproved(uint256) public pure override returns (address) {
        return address(0);
    }
    
    function isApprovedForAll(address, address) public pure override returns (bool) {
        return false;
    }
    
    // Interface support
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // Get total supply
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // Function để lấy thông tin certificate (không phụ thuộc vào NFT đã mint)
    function getCertificate(uint256 tokenId) public view returns (Certificate memory) {
        require(certificateExists(tokenId), "Certificate does not exist");
        return certificates[tokenId];
    }
    
    // Function để kiểm tra quyền sở hữu thực tế của NFT
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
    
    // Function để kiểm tra quyền claim
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

    // Helper function to check if a certificate exists
    function certificateExists(uint256 tokenId) internal view returns (bool) {
        return certificates[tokenId].holder != address(0);
    }
}