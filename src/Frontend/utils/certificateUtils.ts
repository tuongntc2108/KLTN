/**
 * Certificate Utilities
 * Pure functions for certificate-related operations
 */

/**
 * Generate share URL for a certificate
 * @param origin - Window origin (e.g., http://localhost:3000)
 * @param tokenId - Certificate token ID
 * @returns Full share URL
 */
export function generateCertificateShareUrl(origin: string, tokenId: string): string {
  if (!origin || !tokenId) {
    return ""
  }
  return `${origin}/certificates/${tokenId}`
}

/**
 * Generate PDF download URL for a certificate
 * @param tokenId - Certificate token ID
 * @returns PDF API endpoint URL
 */
export function generatePdfUrl(tokenId: string): string {
  if (!tokenId) {
    return ""
  }
  return `/api/certificates/public/${tokenId}/pdf`
}

/**
 * Generate QR Code URL from a share URL
 * @param shareUrl - The share link URL
 * @param size - QR code size (default: 200x200)
 * @returns QR code image URL from external service
 */
export function generateQrCodeUrl(shareUrl: string, size: string = "200x200"): string {
  if (!shareUrl) {
    return ""
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodeURIComponent(shareUrl)}`
}

/**
 * Validate if a token ID is valid format
 * @param tokenId - Token ID to validate
 * @returns True if valid
 */
export function isValidTokenId(tokenId: string | string[] | undefined): boolean {
  if (!tokenId) {
    return false
  }
  if (Array.isArray(tokenId)) {
    tokenId = tokenId[0]
  }
  return typeof tokenId === "string" && tokenId.trim().length > 0
}

/**
 * Extract token ID from various formats
 * @param tokenId - Can be string or string array
 * @returns Normalized token ID string or undefined
 */
export function normalizeTokenId(tokenId: string | string[] | undefined): string | undefined {
  if (!tokenId) {
    return undefined
  }
  if (Array.isArray(tokenId)) {
    tokenId = tokenId[0]
  }
  return tokenId?.trim() || undefined
}
