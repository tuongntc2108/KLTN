"use client"

/**
 * Certificate PDF Download Button Component
 * Reusable button for downloading certificate as PDF
 */

import React from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export interface CertificatePdfButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Certificate token ID to download
   */
  tokenId: string

  /**
   * Callback when download button is clicked
   */
  onDownload: (tokenId: string) => void

  /**
   * Whether to show the label text
   */
  showLabel?: boolean

  /**
   * Custom label text
   */
  label?: string

  /**
   * Whether the download is in progress
   */
  isLoading?: boolean

  /**
   * Button variant style
   */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"

  /**
   * Button size
   */
  size?: "default" | "sm" | "lg" | "icon"
}

/**
 * Button component for downloading certificates as PDF
 * Opens PDF in a new tab
 *
 * @example
 * ```tsx
 * const { downloadPdf } = useCertificateShare()
 *
 * <CertificatePdfButton
 *   tokenId={cert.tokenId}
 *   onDownload={downloadPdf}
 * />
 * ```
 */
export function CertificatePdfButton({
  tokenId,
  onDownload,
  showLabel = true,
  label = "Tải PDF",
  isLoading = false,
  variant = "outline",
  size = "sm",
  ...props
}: CertificatePdfButtonProps) {
  const handleClick = () => {
    if (tokenId && !isLoading) {
      onDownload(tokenId)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={!tokenId || isLoading}
      {...props}
    >
      <Download className="h-4 w-4 mr-2" />
      {showLabel && (isLoading ? "Đang tải..." : label)}
    </Button>
  )
}
