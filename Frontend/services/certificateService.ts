/**
 * Certificate Service
 * Business logic for certificate operations
 */

import { generateCertificateShareUrl, generatePdfUrl, generateQrCodeUrl } from "@/utils/certificateUtils"

interface ToastMessage {
  title: string
  description: string
  variant?: "default" | "destructive"
}

interface ToastHandler {
  toast: (message: ToastMessage) => void
}

/**
 * Share a certificate by generating its share URL
 * @param origin - Window origin
 * @param tokenId - Certificate token ID
 * @returns Share URL
 */
export function shareCertificate(origin: string, tokenId: string): string {
  return generateCertificateShareUrl(origin, tokenId)
}

/**
 * Copy certificate share link to clipboard
 * @param shareUrl - URL to copy
 * @param toastHandler - Toast notification handler
 */
export async function copyCertificateShareLink(
  shareUrl: string,
  toastHandler: ToastHandler
): Promise<void> {
  if (!shareUrl) {
    toastHandler.toast({
      title: "Lỗi",
      description: "Không có liên kết để sao chép.",
      variant: "destructive",
    })
    return
  }

  try {
    await navigator.clipboard.writeText(shareUrl)
    toastHandler.toast({
      title: "Đã sao chép",
      description: "Liên kết chia sẻ đã được sao chép.",
    })
  } catch (error) {
    console.error("Failed to copy:", error)
    toastHandler.toast({
      title: "Không thể sao chép",
      description: "Vui lòng thử lại.",
      variant: "destructive",
    })
  }
}

/**
 * Download certificate as PDF
 * @param tokenId - Certificate token ID
 */
export function downloadCertificatePdf(tokenId: string): void {
  if (!tokenId) {
    console.warn("Cannot download PDF: Invalid token ID")
    return
  }

  const pdfUrl = generatePdfUrl(tokenId)
  window.open(pdfUrl, "_blank", "noopener,noreferrer")
}

/**
 * Get QR code URL for certificate share link
 * @param shareUrl - Share URL
 * @returns QR code image URL
 */
export function getCertificateQrCode(shareUrl: string): string {
  return generateQrCodeUrl(shareUrl)
}

/**
 * Get all certificate URLs at once
 * @param origin - Window origin
 * @param tokenId - Certificate token ID
 * @returns Object containing all necessary URLs
 */
export function getCertificateUrls(origin: string, tokenId: string) {
  const shareUrl = generateCertificateShareUrl(origin, tokenId)
  const pdfUrl = generatePdfUrl(tokenId)
  const qrUrl = generateQrCodeUrl(shareUrl)

  return {
    shareUrl,
    pdfUrl,
    qrUrl,
  }
}

/**
 * Certificate service object aggregating all operations
 */
export const certificateService = {
  share: shareCertificate,
  copyShareLink: copyCertificateShareLink,
  downloadPdf: downloadCertificatePdf,
  getQrCode: getCertificateQrCode,
  getUrls: getCertificateUrls,
}
