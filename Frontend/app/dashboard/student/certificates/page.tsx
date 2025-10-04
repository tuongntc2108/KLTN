"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCertificates } from "@/hooks/use-certificates"
import { useState, useMemo } from "react"
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
  QrCode,
  ExternalLink,
  Calendar,
  Building,
  Loader2,
  RefreshCw,
} from "lucide-react"

export default function StudentCertificates() {
  const { certificates, student, loading, error, refreshCertificates } = useCertificates()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Filter certificates based on search term and status
  const filteredCertificates = useMemo(() => {
    return certificates.filter(cert => {
      const matchesSearch = cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cert.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cert.issuer.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || cert.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [certificates, searchTerm, statusFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Có hiệu lực
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Chờ nhận
          </Badge>
        )
      case "expiring":
        return (
          <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Sắp hết hạn
          </Badge>
        )
      case "expired":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Đã hết hạn
          </Badge>
        )
      case "revoked":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Đã thu hồi
          </Badge>
        )
      default:
        return null
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
          <h1 className="text-3xl font-bold text-balance">Chứng chỉ của tôi</h1>
          <p className="text-muted-foreground">
            Quản lý và chia sẻ các chứng chỉ số của bạn
            {student && ` - ${student.name}`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={refreshCertificates} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Làm mới
          </Button>
          <Button variant="outline">
            <QrCode className="w-4 h-4 mr-2" />
            Tạo mã QR
          </Button>
          <Button>
            <Share className="w-4 h-4 mr-2" />
            Chia sẻ hồ sơ
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
                placeholder="Tìm kiếm chứng chỉ..." 
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
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Có hiệu lực</option>
              <option value="pending">Chờ nhận</option>
              <option value="expiring">Sắp hết hạn</option>
              <option value="expired">Hết hạn</option>
              <option value="revoked">Thu hồi</option>
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
                    <CardTitle className="text-lg">{cert.name}</CardTitle>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        {cert.issuer}
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Khóa học</p>
                  <p>{cert.course}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Kết quả</p>
                  <p>{cert.grade}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Ngày hết hạn</p>
                  <p>{cert.expiryDate}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Token ID</p>
                  <p className="font-mono text-xs truncate">{cert.tokenId}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Tải PDF
                </Button>
                <Button size="sm" variant="outline">
                  <Share className="w-4 h-4 mr-2" />
                  Chia sẻ
                </Button>
                <Button size="sm" variant="outline">
                  <QrCode className="w-4 h-4 mr-2" />
                  Mã QR
                </Button>
                <Button size="sm" variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Xem trên Blockchain
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!loading && filteredCertificates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="w-12 h-12 text-muted-foreground mb-4" />
            {certificates.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold mb-2">Chưa có chứng chỉ nào</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {student?.wallet_address 
                    ? "Bạn chưa có chứng chỉ nào. Hãy tham gia các khóa học để nhận chứng chỉ đầu tiên!"
                    : "Vui lòng kết nối ví để xem chứng chỉ của bạn."
                  }
                </p>
                <Button>Khám phá khóa học</Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Không tìm thấy chứng chỉ</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Không có chứng chỉ nào phù hợp với tìm kiếm của bạn.
                </p>
                <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                  Xóa bộ lọc
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
