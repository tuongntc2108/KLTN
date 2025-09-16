"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

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
  const { toast } = useToast()

  // Fetch certificates from API
  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Using VNU-UET-001 as the issuer ID (should be dynamic based on logged-in user)
        const response = await fetch('http://localhost:4000/api/certificates/issuer/VNU-UET-001?limit=50')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data: ApiResponse = await response.json()
        
        if (data.success) {
          setCertificates(data.certificates)
        } else {
          throw new Error(data.message || 'Failed to fetch certificates')
        }
      } catch (error) {
        console.error('Error fetching certificates:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
        toast({
          title: "Error",
          description: "Failed to load certificates. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCertificates()
  }, [])

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch =
      cert.certificate.recipient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.certificate.certificate_detail.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.certificate.token_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || cert.certificate.status === statusFilter
    const matchesType = typeFilter === "all" || cert.certificate.certificate_detail.certificate_name.toLowerCase().includes(typeFilter.toLowerCase())

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Hoạt động
          </Badge>
        )
      case "issued_not_claimed":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Chờ nhận
          </Badge>
        )
      case "expired":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Hết hạn
          </Badge>
        )
      case "revoked":
        return (
          <Badge variant="destructive">
            <Ban className="w-3 h-3 mr-1" />
            Đã thu hồi
          </Badge>
        )
      case "replaced":
        return (
          <Badge variant="outline">
            <RotateCcw className="w-3 h-3 mr-1" />
            Đã thay thế
          </Badge>
        )
      default:
        return <Badge variant="outline">Không xác định</Badge>
    }
  }

  const getStatusCount = (status: string) => {
    return certificates.filter((cert) => cert.certificate.status === status).length
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Chứng chỉ</h1>
            <p className="text-muted-foreground">Theo dõi và quản lý tất cả chứng chỉ đã cấp</p>
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
            <p className="text-muted-foreground">Theo dõi và quản lý tất cả chứng chỉ đã cấp</p>
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
            <p className="text-muted-foreground">Theo dõi và quản lý tất cả chứng chỉ đã cấp</p>
          </div>
          <Link href="/dashboard/training/certificates/issue">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Cấp chứng chỉ mới
            </Button>
          </Link>
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
            <CardTitle className="text-sm font-medium">Chờ nhận</CardTitle>
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
          <CardDescription>Tìm kiếm và quản lý chứng chỉ đã cấp</CardDescription>
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
                <SelectItem value="issued_not_claimed">Chờ nhận</SelectItem>
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
                const certificate = cert.certificate
                const tokenId = certificate.token_id
                const studentName = certificate.recipient.full_name
                const courseName = certificate.certificate_detail.course_name
                const certificateName = certificate.certificate_detail.certificate_name
                const issueDate = new Date(certificate.certificate_detail.issue_date)
                const expiryDate = new Date(certificate.certificate_detail.expire_date)
                const status = certificate.status
                const walletAddress = certificate.recipient.wallet_address
                const blockchainTx = certificate.verification.smart_contract
                const ipfsHash = certificate.file_hash.pdf_url

                return (
                  <Card key={tokenId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {studentName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
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
                            onClick={() => window.open(`https://sepolia.etherscan.io/address/${blockchainTx}`, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Blockchain
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-1" />
                            Quản lý
                          </Button>
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
                          <p className="font-medium mb-1">Smart Contract:</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded block">
                            {blockchainTx.slice(0, 8)}...{blockchainTx.slice(-6)}
                          </code>
                        </div>
                        <div>
                          <p className="font-medium mb-1">IPFS Hash:</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded block">
                            {ipfsHash.replace('ipfs://', '').slice(0, 8)}...{ipfsHash.replace('ipfs://', '').slice(-6)}
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
