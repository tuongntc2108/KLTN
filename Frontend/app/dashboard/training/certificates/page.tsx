"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  Download,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Eye,
  Edit,
  RotateCcw,
  Ban,
  ExternalLink,
  Loader2,
  RefreshCw,
  Replace,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useCourses } from "@/hooks/use-courses"

interface Certificate {
  verified: boolean
  certificate: {
    token_id: string
    status: string
    metadata_uri: string
    issuer: {
      name: string
      id: string
      url: string
    }
    recipient: {
      full_name: string
      wallet_address: string
      email_hash: string
      student_id: string
    }
    certificate_detail: {
      course_name: string
      certificate_name: string
      issue_date: string
      expire_date: string
      status: string
    }
    file_hash: {
      sha256: string
      pdf_url: string
    }
    verification: {
      blockchain: string
      chain_id: number
      smart_contract: string
      verified_at: string
    }
  }
}

interface ApiResponse {
  success: boolean
  message: string
  issuer: {
    id: string
    name: string
    url: string
  }
  certificates: Certificate[]
}

export default function CertificatesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [revokeReason, setRevokeReason] = useState("")
  const [certificateToRevoke, setCertificateToRevoke] = useState<Certificate | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false)
  const [certificateToReplace, setCertificateToReplace] = useState<Certificate | null>(null)
  const [isReplacing, setIsReplacing] = useState(false)

  // Centralized status mapping utility for consistent status handling
  const normalizeStatus = (status: string): string => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'active':
        return 'active';
      case 'issued':
      case 'issued_not_claimed':
        return 'issued_not_claimed';
      case 'revoked':
        return 'revoked';
      case 'expired':
        return 'expired';
      case 'replaced':
        return 'replaced';
      default:
        return status;
    }
  };

  // Check if status matches filter (handles multiple status variations)
  const statusMatches = (certificateStatus: string, filterStatus: string): boolean => {
    if (filterStatus === "all") return true;
    
    const normalizedCertStatus = normalizeStatus(certificateStatus);
    const normalizedFilterStatus = normalizeStatus(filterStatus);
    
    return normalizedCertStatus === normalizedFilterStatus;
  };

  // Fetch certificates from API
  const fetchCertificates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get all certificates in the system (as requested)
      const response = await fetch('/api/certificates/all?limit=100', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login first.')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: ApiResponse = await response.json()
      
      if (data.success) {
        setCertificates(data.certificates)
        // Debug: Log certificate statuses to help troubleshoot
        console.log('Certificate statuses:', data.certificates.map(cert => ({
          tokenId: cert?.certificate?.token_id,
          status: cert?.certificate?.status,
          normalized: normalizeStatus(cert?.certificate?.status || "")
        })))
      } else {
        throw new Error(data.message || 'Failed to fetch certificates')
      }
    } catch (err) {
      console.error('Error fetching certificates:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      toast({
        title: "Error",
        description: "Failed to load certificates. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Manual refresh function
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  // Handle revoke certificate
  const handleRevokeCertificate = async () => {
    if (!certificateToRevoke || !revokeReason.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập lý do thu hồi",
        variant: "destructive",
      })
      return
    }

    try {
      setIsRevoking(true)
      const tokenId = certificateToRevoke.certificate.token_id
      
      const response = await fetch(`/api/certificates/${tokenId}/revoke`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: revokeReason.trim() })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      toast({
        title: "Thành công",
        description: "Chứng chỉ đã được thu hồi thành công",
      })
      
      // Close dialog and reset state
      setRevokeDialogOpen(false)
      setCertificateToRevoke(null)
      setRevokeReason("")
      
      // Refresh certificates list
      handleRefresh()
    } catch (err) {
      console.error('Error revoking certificate:', err)
      toast({
        title: "Lỗi",
        description: "Không thể thu hồi chứng chỉ. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setIsRevoking(false)
    }
  }

  // Handle replace certificate
  const handleReplaceCertificate = async (replaceData: any) => {
    if (!certificateToReplace) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy chứng chỉ để thay thế",
        variant: "destructive",
      })
      return
    }

    try {
      setIsReplacing(true)
      const oldTokenId = certificateToReplace.certificate.token_id
      
      const response = await fetch(`/api/certificates/${oldTokenId}/replace`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(replaceData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to replace certificate')
      }

      const result = await response.json()
      
      toast({
        title: "Thay thế chứng chỉ thành công",
        description: `Chứng chỉ cũ: ${result.replaced_old_cert_id}, Chứng chỉ mới: ${result.new_certificate_id}`,
      })
      
      // Close dialog and reset state
      setReplaceDialogOpen(false)
      setCertificateToReplace(null)
      
      // Refresh certificates list
      handleRefresh()
    } catch (err) {
      console.error('Error replacing certificate:', err)
      toast({
        title: "Lỗi",
        description: (err as Error)?.message || "Không thể thay thế chứng chỉ. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setIsReplacing(false)
    }
  }

  useEffect(() => {
    fetchCertificates()
  }, [refreshTrigger])

  // Check for refresh parameter and auto-refresh
  useEffect(() => {
    const refreshParam = searchParams.get('refresh')
    if (refreshParam === 'true') {
      // Clear the URL parameter
      window.history.replaceState(null, '', '/dashboard/training/certificates')
      // Trigger refresh
      handleRefresh()
      toast({
        title: "Đã cập nhật",
        description: "Danh sách chứng chỉ đã được làm mới",
      })
    }
  }, [searchParams])

  const filteredCertificates = certificates.filter((cert) => {
    // Defensive checks for undefined objects
    const recipientName = cert?.certificate?.recipient?.full_name || "";
    const courseName = cert?.certificate?.certificate_detail?.course_name || "";
    const tokenId = cert?.certificate?.token_id || "";
    const certificateName = cert?.certificate?.certificate_detail?.certificate_name || "";
    const status = cert?.certificate?.status || "";

    const matchesSearch =
      recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tokenId.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Use centralized status matching utility
    const matchesStatus = statusMatches(status, statusFilter);
    
    const matchesType = typeFilter === "all" || certificateName.toLowerCase().includes(typeFilter.toLowerCase())

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
      case "Active":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Hoạt động
          </Badge>
        )
      case "issued_not_claimed":
      case "issued":
      case "Issued":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <Clock className="w-3 h-3 mr-1" />
            Đang chờ nhận
          </Badge>
        )
      case "revoked":
      case "Revoked":
        return (
          <Badge variant="destructive">
            <Ban className="w-3 h-3 mr-1" />
            Đã thu hồi
          </Badge>
        )
      case "expired":
      case "Expired":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Hết hạn
          </Badge>
        )
      case "replaced":
      case "Replaced":
        return (
          <Badge variant="outline">
            <RotateCcw className="w-3 h-3 mr-1" />
            Đã thay thế
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Không xác định
          </Badge>
        )
    }
  }

  const getStatusCount = (status: string) => {
    return certificates.filter((cert) => {
      const certStatus = cert?.certificate?.status || "";
      return statusMatches(certStatus, status);
    }).length;
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Chứng chỉ</h1>
            <p className="text-muted-foreground">Theo dõi và quản lý tất cả chứng chỉ trong hệ thống</p>
          </div>
          <Button disabled>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        
        {/* Loading Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Loading List */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-20 w-full" />
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Chứng chỉ</h1>
            <p className="text-muted-foreground">Theo dõi và quản lý tất cả chứng chỉ trong hệ thống</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Certificates</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Chứng chỉ</h1>
            <p className="text-muted-foreground">Theo dõi và quản lý tất cả chứng chỉ trong hệ thống</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Link href="/dashboard/training/certificates/issue">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Cấp chứng chỉ mới
              </Button>
            </Link>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificates.length}</div>
            <p className="text-xs text-muted-foreground">Chứng chỉ đã cấp</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoạt động</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusCount("active")}</div>
            <p className="text-xs text-muted-foreground">Đang có hiệu lực</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang chờ nhận</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusCount("issued_not_claimed")}</div>
            <p className="text-xs text-muted-foreground">Chưa được nhận</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hết hạn</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusCount("expired")}</div>
            <p className="text-xs text-muted-foreground">Cần gia hạn</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thu hồi</CardTitle>
            <Ban className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusCount("revoked")}</div>
            <p className="text-xs text-muted-foreground">Đã bị thu hồi</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Chứng chỉ</CardTitle>
          <CardDescription>Tìm kiếm và quản lý tất cả chứng chỉ trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Tìm kiếm theo tên học viên, khóa học hoặc mã chứng chỉ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="issued_not_claimed">Đang chờ nhận</SelectItem>
                <SelectItem value="expired">Hết hạn</SelectItem>
                <SelectItem value="revoked">Thu hồi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Loại chứng chỉ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="foundation">Foundation</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Xuất báo cáo
            </Button>
          </div>

          {/* Certificates List */}
          <div className="space-y-4">
            {filteredCertificates.length === 0 ? (
              <Card className="p-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <Award className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No certificates found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                      ? "Try adjusting your search filters"
                      : "You haven't issued any certificates yet"}
                  </p>
                  {!searchTerm && statusFilter === "all" && typeFilter === "all" && (
                    <Link href="/dashboard/training/certificates/issue">
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Issue your first certificate
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            ) : (
              filteredCertificates.map((cert) => {
                const certificate = cert?.certificate || {}
                const tokenId = certificate?.token_id || "N/A"
                const studentName = certificate?.recipient?.full_name || "Unknown Student"
                const courseName = certificate?.certificate_detail?.course_name || "Unknown Course"
                const certificateName = certificate?.certificate_detail?.certificate_name || "Unknown Certificate"
                const issueDate = certificate?.certificate_detail?.issue_date ? new Date(certificate.certificate_detail.issue_date) : new Date()
                const expiryDate = certificate?.certificate_detail?.expire_date ? new Date(certificate.certificate_detail.expire_date) : new Date()
                const status = certificate?.status || "unknown"
                const walletAddress = certificate?.recipient?.wallet_address || ""
                const blockchainTx = certificate?.verification?.smart_contract || ""
                const ipfsHash = certificate?.file_hash?.pdf_url || ""

                return (
                  <Card key={tokenId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {studentName && studentName !== "Unknown Student"
                              ? studentName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                              : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{courseName}</h3>
                            {getStatusBadge(status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              Học viên: <strong>{studentName}</strong>
                            </span>
                            <span>
                              Token ID: <code className="bg-muted px-1 rounded">{tokenId}</code>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="font-medium">Cấp: {issueDate.toLocaleDateString("vi-VN")}</div>
                          <div className="text-muted-foreground">
                            Hết hạn: {expiryDate.toLocaleDateString("vi-VN")}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Xem
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => blockchainTx && window.open(`https://sepolia.etherscan.io/address/${blockchainTx}`, '_blank')}
                            disabled={!blockchainTx}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Blockchain
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-1" />
                            Quản lý
                          </Button>
                          {/* Replace Button - Only show for active and issued certificates */}
                          {(status.toLowerCase() === 'active' || status.toLowerCase() === 'issued_not_claimed') && (
                            <Dialog open={replaceDialogOpen} onOpenChange={(open) => {
                              setReplaceDialogOpen(open)
                              if (!open) {
                                setCertificateToReplace(null)
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setCertificateToReplace(cert)}
                                >
                                  <Replace className="w-4 h-4 mr-1" />
                                  Thay thế
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                  <DialogTitle>Thay thế chứng chỉ</DialogTitle>
                                  <DialogDescription>
                                    Bạn đang thay thế chứng chỉ với mã token <strong>{tokenId}</strong> của học viên <strong>{studentName}</strong>.
                                    Mã sinh viên sẽ được tự động điền sẵn và không thể sửa.
                                  </DialogDescription>
                                </DialogHeader>
                                <ReplaceCertificateForm 
                                  certificate={cert}
                                  onReplace={handleReplaceCertificate}
                                  isReplacing={isReplacing}
                                  onCancel={() => {
                                    setReplaceDialogOpen(false)
                                    setCertificateToReplace(null)
                                  }}
                                />
                              </DialogContent>
                            </Dialog>
                          )}
                          {/* Revoke Button - Only show for active certificates */}
                          {status.toLowerCase() === 'active' && (
                            <Dialog open={revokeDialogOpen} onOpenChange={(open) => {
                              setRevokeDialogOpen(open)
                              if (!open) {
                                setCertificateToRevoke(null)
                                setRevokeReason("")
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => setCertificateToRevoke(cert)}
                                >
                                  <Ban className="w-4 h-4 mr-1" />
                                  Thu hồi
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Thu hồi chứng chỉ</DialogTitle>
                                  <DialogDescription>
                                    Bạn đang thu hồi chứng chỉ với mã token <strong>{tokenId}</strong> của học viên <strong>{studentName}</strong>.
                                    Vui lòng nhập lý do thu hồi bên dưới.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Textarea
                                      id="reason"
                                      placeholder="Nhập lý do thu hồi chứng chỉ..."
                                      className="col-span-4"
                                      value={revokeReason}
                                      onChange={(e) => setRevokeReason(e.target.value)}
                                      rows={4}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setRevokeDialogOpen(false)
                                      setCertificateToRevoke(null)
                                      setRevokeReason("")
                                    }}
                                    disabled={isRevoking}
                                  >
                                    Hủy
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    onClick={handleRevokeCertificate}
                                    disabled={isRevoking || !revokeReason.trim()}
                                  >
                                    {isRevoking ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Đang thu hồi...
                                      </>
                                    ) : (
                                      "Xác nhận thu hồi"
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium mb-1">Loại chứng chỉ:</p>
                          <Badge variant="secondary">{certificateName}</Badge>
                        </div>
                        <div>
                          <p className="font-medium mb-1">IPFS Hash:</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded block">
                            {ipfsHash ? `${ipfsHash.replace('ipfs://', '').slice(0, 8)}...${ipfsHash.replace('ipfs://', '').slice(-6)}` : "N/A"}
                          </code>
                        </div>
                        <div>
                          <p className="font-medium mb-1">Địa chỉ ví:</p>
                          {walletAddress ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded block">
                              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                            </code>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Chưa kết nối
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Replace Certificate Form Component
interface ReplaceCertificateFormProps {
  certificate: Certificate
  onReplace: (data: any) => void
  isReplacing: boolean
  onCancel: () => void
}

function ReplaceCertificateForm({ certificate, onReplace, isReplacing, onCancel }: ReplaceCertificateFormProps) {
  const { courses, loading: coursesLoading, fetchCourses } = useCourses()
  const [formData, setFormData] = useState({
    studentId: "",
    courseName: "",
    certificateName: "",
    issuerName: "VNU University",
    issuerId: "VNU-001", 
    issuerUrl: "https://vnu.edu.vn",
    issueDate: "",
    expiryDate: "",
  })

  // Initialize form data when certificate changes
  useEffect(() => {
    if (certificate) {
      const cert = certificate.certificate
      setFormData({
        studentId: cert.recipient?.student_id || "",
        courseName: cert.certificate_detail?.course_name || "",
        certificateName: cert.certificate_detail?.certificate_name || "",
        issuerName: "VNU University",
        issuerId: "VNU-001",
        issuerUrl: "https://vnu.edu.vn",
        issueDate: cert.certificate_detail?.issue_date ? new Date(cert.certificate_detail.issue_date).toISOString().split('T')[0] : "",
        expiryDate: cert.certificate_detail?.expire_date ? new Date(cert.certificate_detail.expire_date).toISOString().split('T')[0] : "",
      })
    }
  }, [certificate])

  // Load courses on mount
  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (!formData.certificateName || !formData.courseName || !formData.issueDate) {
      return
    }

    // Generate SHA256 hash for verification (simplified)
    const sha256Hash = `hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const pdfIpfsHash = `Qm${Math.random().toString(36).substr(2, 44)}`

    // Extract student ID from the original certificate
    const originalStudentId = certificate?.certificate?.recipient?.student_id || ""
    
    const replaceData = {
      student_id: originalStudentId, // Use the original student ID from the certificate
      course_name: formData.courseName,
      certificate_name: formData.certificateName,
      issuer_name: formData.issuerName,
      issuer_id: formData.issuerId,
      issuer_url: formData.issuerUrl,
      issued_date: formData.issueDate,
      expire_date: formData.expiryDate || null,
      sha256_hash: sha256Hash,
      pdf_ipfs_hash: pdfIpfsHash,
    }

    onReplace(replaceData)
  }

  return (
    <div className="space-y-4 py-4">
      <div className="grid gap-4">
        {/* Student ID - Read only */}
        <div>
          <Label htmlFor="studentId">Mã sinh viên</Label>
          <Input
            id="studentId"
            value={formData.studentId}
            readOnly
            className="bg-muted cursor-not-allowed"
          />
        </div>

        {/* Student Name - Read only (for reference) */}
        <div>
          <Label htmlFor="studentName">Tên sinh viên</Label>
          <Input
            id="studentName"
            value={certificate?.certificate?.recipient?.full_name || ""}
            readOnly
            className="bg-muted cursor-not-allowed"
            placeholder="Tên sinh viên sẽ hiển thị ở đây"
          />
        </div>

        {/* Certificate Name */}
        <div>
          <Label htmlFor="certificateName">Tên chứng chỉ *</Label>
          <Input
            id="certificateName"
            value={formData.certificateName}
            onChange={(e) => handleInputChange("certificateName", e.target.value)}
            placeholder="Chứng chỉ Tiếng Anh Giao Tiếp - Cấp độ B2"
          />
        </div>

        {/* Course Name */}
        <div>
          <Label htmlFor="courseName">Khóa học *</Label>
          <Input
            id="courseName"
            value={formData.courseName}
            onChange={(e) => handleInputChange("courseName", e.target.value)}
            placeholder="Tên khóa học"
          />
        </div>

        {/* Issue Date */}
        <div>
          <Label htmlFor="issueDate">Ngày cấp *</Label>
          <Input
            id="issueDate"
            type="date"
            value={formData.issueDate}
            onChange={(e) => handleInputChange("issueDate", e.target.value)}
          />
        </div>

        {/* Expiry Date */}
        <div>
          <Label htmlFor="expiryDate">Ngày hết hạn</Label>
          <Input
            id="expiryDate"
            type="date"
            value={formData.expiryDate}
            onChange={(e) => handleInputChange("expiryDate", e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isReplacing}
        >
          Hủy
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isReplacing || !formData.certificateName || !formData.courseName || !formData.issueDate}
        >
          {isReplacing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang thay thế...
            </>
          ) : (
            <>
              <Replace className="w-4 h-4 mr-2" />
              Cấp chứng chỉ NFT
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  )
}