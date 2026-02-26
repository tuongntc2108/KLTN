"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useCertificateShare } from "@/hooks/use-certificate-share"
import { CertificateShareDialog } from "@/components/certificate/CertificateShareDialog"
import { Download, Share } from "lucide-react"

export default function CertificateDetailPage() {
  const params = useParams()
  const tokenId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { toast } = useToast()

  const [htmlContent, setHtmlContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use certificate share hook for share functionality
  const { shareUrl, shareTokenId, shareOpen, qrUrl, setShareOpen, openShare, copyShareLink, downloadPdf } =
    useCertificateShare()

  useEffect(() => {
    if (!tokenId) {
      return
    }

    setLoading(true)
    setError(null)

    fetch(`/api/certificates/public/${tokenId}/html`)
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          const message = data?.message || data?.error || "Không thể tải thông tin chứng chỉ"
          throw new Error(message)
        }
        return response.text()
      })
      .then((html) => {
        setHtmlContent(html)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || "Không thể tải thông tin chứng chỉ")
        setLoading(false)
      })
  }, [tokenId])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="mx-4 my-2">
          <h1 className="text-2xl font-semibold">Chi tiết chứng chỉ</h1>
          <p className="text-sm text-muted-foreground">Token ID: {tokenId}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openShare(tokenId || "")} disabled={!tokenId}>
            <Share className="w-4 h-4 mr-2" />
            Chia sẻ
          </Button>
          <Button variant="outline" onClick={() => downloadPdf(tokenId || "")}>
            <Download className="w-4 h-4 mr-2" />
            Tải PDF
          </Button>
        </div>
      </div>

      {loading && (
        <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
          Đang tải nội dung chứng chỉ...
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <iframe
          title="certificate-detail"
          className="w-full min-h-[calc(100vh-100px)] rounded-md border bg-white"
          srcDoc={htmlContent}
        />
      )}

      <CertificateShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareUrl={shareUrl}
        tokenId={shareTokenId}
        qrUrl={qrUrl}
        onCopyLink={copyShareLink}
      />
    </div>
  )
}
