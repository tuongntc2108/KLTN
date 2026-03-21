"use client"

/**
 * Certificate Share Dialog Component
 * Reusable dialog for sharing certificates with share link and QR code
 */

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QrCode } from "lucide-react"

export interface CertificateShareDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean

  /**
   * Callback when dialog open state changes
   */
  onOpenChange: (open: boolean) => void

  /**
   * The share URL to display
   */
  shareUrl: string

  /**
   * Token ID of the certificate
   */
  tokenId: string

  /**
   * QR code image URL
   */
  qrUrl: string

  /**
   * Callback to copy share link
   */
  onCopyLink: () => Promise<void>

  /**
   * Whether copy operation is in progress
   */
  isLoading?: boolean
}

/**
 * Dialog component for sharing certificates
 * Displays:
 * - Share URL with copy button
 * - QR code for quick access
 * - Token ID reference
 *
 * @example
 * ```tsx
 * const { shareUrl, shareOpen, qrUrl, setShareOpen, copyShareLink } = useCertificateShare()
 *
 * <CertificateShareDialog
 *   open={shareOpen}
 *   onOpenChange={setShareOpen}
 *   shareUrl={shareUrl}
 *   tokenId={tokenId}
 *   qrUrl={qrUrl}
 *   onCopyLink={copyShareLink}
 * />
 * ```
 */
export function CertificateShareDialog({
  open,
  onOpenChange,
  shareUrl,
  tokenId,
  qrUrl,
  onCopyLink,
  isLoading = false,
}: CertificateShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Chia sẻ chứng chỉ</DialogTitle>
          <DialogDescription>Sao chép liên kết hoặc quét QR để xem chi tiết chứng chỉ.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share Link Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Liên kết chia sẻ</label>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="text-sm" />
              <Button
                variant="outline"
                onClick={onCopyLink}
                disabled={!shareUrl || isLoading}
                className="whitespace-nowrap"
              >
                {isLoading ? "Đang sao chép..." : "Sao chép"}
              </Button>
            </div>
          </div>

          {/* QR Code Section */}
          {qrUrl && (
            <div className="flex flex-col items-center gap-2 rounded-md border bg-muted/30 p-4">
              <QrCode className="h-6 w-6 text-muted-foreground" />
              <img src={qrUrl} alt="QR code" className="h-40 w-40" />
              <p className="text-xs text-muted-foreground">Quét mã để truy cập nhanh</p>
              {tokenId && <p className="text-xs text-muted-foreground font-mono">Token ID: {tokenId}</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
