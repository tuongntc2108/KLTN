"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCertificates } from "@/hooks/use-certificates"
import { useMetaMask } from "@/hooks/use-metamask"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { useCertificateShare } from "@/hooks/use-certificate-share"
import { CertificateShareDialog } from "@/components/certificate/CertificateShareDialog"
import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Award,
  Download,
  Share,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  ExternalLink,
  Calendar,
  Building,
  Loader2,
  RefreshCw,
} from "lucide-react"

export default function StudentCertificates() {
  const { certificates, student, loading, error, refreshCertificates, claimCertificate } = useCertificates()
  const { connect, isConnected, account, isMetaMaskInstalled } = useMetaMask()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [claimingTokenId, setClaimingTokenId] = useState<string | null>(null)

  // Use certificate share hook
  const { shareUrl, shareTokenId, shareOpen, qrUrl, setShareOpen, openShare, copyShareLink, downloadPdf } =
    useCertificateShare()

  // Filter certificates based on search term and status
  const filteredCertificates = useMemo(() => {
    return certificates.filter(cert => {
      const matchesSearch = (cert.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cert.course || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cert.issuer || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "All" || cert.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [certificates, searchTerm, statusFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('studentDashboard.statusActive')}
          </Badge>
        )
      case "Issued":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            {t('studentDashboard.statusPending')}
          </Badge>
        )
      case "Expiring":
        return (
          <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {t('certificates.statusExpiring')}
          </Badge>
        )
      case "Expired":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            {t('studentDashboard.statusExpired')}
          </Badge>
        )
      case "Revoked":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {t('studentDashboard.statusRevoked')}
          </Badge>
        )
      case "Replaced":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
            <RefreshCw className="w-3 h-3 mr-1" />
            {t('studentDashboard.statusReplaced')}
          </Badge>
        )
      default:
        return null
    }
  }

  const handleClaimCertificate = async (tokenId: string) => {
    // Check if MetaMask is installed
    if (!isMetaMaskInstalled) {
      toast({
        title: t('certificates.metaMaskNotInstalled'),
        description: t('certificates.installMetaMask'),
        variant: "destructive",
      })
      return
    }

    // Check if wallet is connected
    if (!isConnected || !account) {
      toast({
        title: t('certificates.walletNotConnected'),
        description: t('certificates.connectWalletFirst'),
        variant: "destructive",
      })

      // Try to connect automatically
      const connected = await connect()
      if (!connected) {
        return
      }
    }

    setClaimingTokenId(tokenId)

    try {
      const result = await claimCertificate(tokenId)

      if (result.success) {
        toast({
          title: t('certificates.claimSuccess'),
          description: t('certificates.claimSuccessDesc'),
        })
      } else {
        toast({
          title: t('certificates.claimError'),
          description: result.error || t('certificates.claimErrorDesc'),
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Lỗi hệ thống",
        description: error.message || "Có lỗi xảy ra. Vui lòng thử lại sau.",
        variant: "destructive",
      })
    } finally {
      setClaimingTokenId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Certificates Skeleton */}
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-80" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-8 w-20" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">{t('certificates.title')}</h1>
          <p className="text-muted-foreground">
            {t('certificates.description')}
            {student && ` - ${student.name}`}
          </p>
          {/* MetaMask Connection Status */}

        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={refreshCertificates} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('certificates.searchPlaceholder')}
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md text-sm bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">{t('certificates.allStatuses')}</option>
              <option value="Active">{t('studentDashboard.statusActive')}</option>
              <option value="Issued">{t('studentDashboard.statusPending')}</option>
              <option value="Expiring">{t('certificates.statusExpiring')}</option>
              <option value="Expired">{t('studentDashboard.statusExpired')}</option>
              <option value="Revoked">{t('studentDashboard.statusRevoked')}</option>
              <option value="Replaced">{t('studentDashboard.statusReplaced')}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Certificates Grid */}
      <div className="grid gap-6">
        {filteredCertificates.map((cert) => (
          <Card key={cert.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20">
                    <Award className="h-6 w-6 text-secondary" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{cert.name || t('certificates.unknownCert')}</CardTitle>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        {cert.issuer || t('common.notAvailable')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {cert.issueDate}
                      </span>
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(cert.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{cert.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">{t('certificates.courseLabel')}</p>
                  <p>{cert.course}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">{t('certificates.gradeLabel')}</p>
                  <p>{cert.grade}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">{t('certificates.expireDateLabel')}</p>
                  <p>{cert.expiryDate}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">{t('certificates.verifyCodeLabel')}</p>
                  <p className="font-mono text-xs truncate">{cert.verificationCode}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Token ID</p>
                  <p className="font-mono text-xs truncate">{cert.tokenId}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {cert.status === "Issued" && (
                  <Button
                    size="sm"
                    onClick={() => handleClaimCertificate(cert.tokenId)}
                    disabled={claimingTokenId === cert.tokenId}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {claimingTokenId === cert.tokenId ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('common.processing')}
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4 mr-2" />
                        {t('certificates.claimButton')}
                      </>
                    )}
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/certificates/${cert.tokenId}`} target="_blank">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('certificates.viewDetails')}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => openShare(cert.tokenId)}>
                  <Share className="w-4 h-4 mr-2" />
                  {t('certificates.shareButton')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadPdf(cert.tokenId)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('certificates.downloadPDF')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CertificateShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareUrl={shareUrl}
        tokenId={shareTokenId || ""}
        qrUrl={qrUrl}
        onCopyLink={copyShareLink}
      />

      {/* Empty State */}
      {!loading && filteredCertificates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="w-12 h-12 text-muted-foreground mb-4" />
            {certificates.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold mb-2">{t('certificates.noCerts')}</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {student?.wallet_address
                    ? t('certificates.noCertsDesc')
                    : t('certificates.connectWalletPrompt')
                  }
                </p>
                <Button>{t('certificates.exploreCourses')}</Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">{t('certificates.noResults')}</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {t('certificates.noResultsDesc')}
                </p>
                <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("All"); }}>
                  {t('certificates.clearFilters')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
