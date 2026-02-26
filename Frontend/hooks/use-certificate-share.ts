/**
 * Certificate Share Hook
 * Manages certificate sharing state and operations
 */

import { useState, useCallback, useEffect, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { certificateService } from "@/services/certificateService"
import { generateQrCodeUrl } from "@/utils/certificateUtils"

interface UseCertificateShareReturn {
  // State
  shareUrl: string
  shareTokenId: string
  shareOpen: boolean
  qrUrl: string

  // State setters
  setShareOpen: (open: boolean) => void
  setShareUrl: (url: string) => void

  // Actions
  openShare: (tokenId: string) => void
  closeShare: () => void
  copyShareLink: () => Promise<void>
  downloadPdf: (tokenId: string) => void
}

/**
 * Custom hook for managing certificate share functionality
 * Encapsulates all share-related state and logic
 *
 * Usage:
 * ```tsx
 * const {
 *   shareUrl, shareOpen, qrUrl, setShareOpen,
 *   openShare, copyShareLink, downloadPdf
 * } = useCertificateShare()
 *
 * // In component:
 * <Button onClick={() => openShare(tokenId)}>Share</Button>
 * <CertificateShareDialog
 *   open={shareOpen}
 *   onOpenChange={setShareOpen}
 *   shareUrl={shareUrl}
 *   qrUrl={qrUrl}
 *   onCopyLink={copyShareLink}
 * />
 * ```
 */
export function useCertificateShare(): UseCertificateShareReturn {
  const { toast } = useToast()

  // State management
  const [shareUrl, setShareUrl] = useState<string>("")
  const [shareTokenId, setShareTokenId] = useState<string>("")
  const [shareOpen, setShareOpen] = useState<boolean>(false)

  // Generate QR code URL whenever share URL changes
  const qrUrl = useMemo(() => {
    if (!shareUrl) return ""
    return generateQrCodeUrl(shareUrl)
  }, [shareUrl])

  // Open share dialog with token ID
  const openShare = useCallback(
    (tokenId: string) => {
      if (!tokenId || typeof window === "undefined") {
        return
      }

      try {
        // Generate share URL
        const url = certificateService.share(window.location.origin, tokenId)

        if (url) {
          setShareUrl(url)
          setShareTokenId(tokenId)
          setShareOpen(true)
        } else {
          toast({
            title: "Lỗi",
            description: "Không thể tạo liên kết chia sẻ.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error opening share:", error)
        toast({
          title: "Lỗi hệ thống",
          description: "Có lỗi xảy ra. Vui lòng thử lại.",
          variant: "destructive",
        })
      }
    },
    [toast]
  )

  // Close share dialog
  const closeShare = useCallback(() => {
    setShareOpen(false)
  }, [])

  // Copy share link to clipboard
  const copyShareLink = useCallback(async () => {
    await certificateService.copyShareLink(shareUrl, { toast })
  }, [shareUrl, toast])

  // Download certificate PDF
  const downloadPdf = useCallback((tokenId: string) => {
    if (!tokenId) {
      toast({
        title: "Lỗi",
        description: "Token ID không hợp lệ.",
        variant: "destructive",
      })
      return
    }

    certificateService.downloadPdf(tokenId)
  }, [toast])

  return {
    // State
    shareUrl,
    shareTokenId,
    shareOpen,
    qrUrl,

    // Setters
    setShareOpen,
    setShareUrl,

    // Actions
    openShare,
    closeShare,
    copyShareLink,
    downloadPdf,
  }
}
