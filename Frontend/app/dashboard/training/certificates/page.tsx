"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
} from "lucide-react"

const certificates = [
  {
    id: "CERT-001",
    tokenId: "12345",
    studentName: "Nguyễn Văn An",
    studentEmail: "an.nguyen@email.com",
    studentAvatar: "/placeholder.svg?height=32&width=32",
    courseName: "Digital Marketing Professional",
    certificateType: "Professional Certificate",
    issueDate: "2024-01-20",
    expiryDate: "2025-01-20",
    status: "active",
    blockchainTx: "0x742d35Cc6634C0532925a3b8D4C9db96590b4077",
    ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    walletAddress: "0x742d35Cc6634C0532925a3b8D4C9db96590b4077",
  },
  {
    id: "CERT-002",
    tokenId: "12346",
    studentName: "Trần Thị Bình",
    studentEmail: "binh.tran@email.com",
    studentAvatar: "/placeholder.svg?height=32&width=32",
    courseName: "English Communication Advanced",
    certificateType: "Advanced Certificate",
    issueDate: "2024-02-15",
    expiryDate: "2025-02-15",
    status: "issued_not_claimed",
    blockchainTx: "0x8ba1f109551bD432803012645Hac136c30C6213",
    ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    walletAddress: null,
  },
  {
    id: "CERT-003",
    tokenId: "12347",
    studentName: "Lê Minh Cường",
    studentEmail: "cuong.le@email.com",
    studentAvatar: "/placeholder.svg?height=32&width=32",
    courseName: "Project Management Fundamentals",
    certificateType: "Foundation Certificate",
    issueDate: "2024-01-10",
    expiryDate: "2024-12-10",
    status: "expired",
    blockchainTx: "0x9ca2f208662bE432804012645Hac136c30C6214",
    ipfsHash: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    walletAddress: "0x9ca2f208662bE432804012645Hac136c30C6214",
  },
]

export default function CertificatesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch =
      cert.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || cert.status === statusFilter
    const matchesType = typeFilter === "all" || cert.certificateType.toLowerCase().includes(typeFilter.toLowerCase())

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
    return certificates.filter((cert) => cert.status === status).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Chứng chỉ</h1>
          <p className="text-muted-foreground">Theo dõi và quản lý tất cả chứng chỉ đã cấp</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Cấp chứng chỉ mới
        </Button>
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
            {filteredCertificates.map((cert) => (
              <Card key={cert.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={cert.studentAvatar || "/placeholder.svg"} alt={cert.studentName} />
                      <AvatarFallback>
                        {cert.studentName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{cert.courseName}</h3>
                        {getStatusBadge(cert.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Học viên: <strong>{cert.studentName}</strong>
                        </span>
                        <span>
                          Mã: <code className="bg-muted px-1 rounded">{cert.id}</code>
                        </span>
                        <span>
                          Token ID: <code className="bg-muted px-1 rounded">{cert.tokenId}</code>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="font-medium">Cấp: {new Date(cert.issueDate).toLocaleDateString("vi-VN")}</div>
                      <div className="text-muted-foreground">
                        Hết hạn: {new Date(cert.expiryDate).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Xem
                      </Button>
                      <Button variant="outline" size="sm">
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
                      <Badge variant="secondary">{cert.certificateType}</Badge>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Blockchain TX:</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block">
                        {cert.blockchainTx.slice(0, 8)}...{cert.blockchainTx.slice(-6)}
                      </code>
                    </div>
                    <div>
                      <p className="font-medium mb-1">IPFS Hash:</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block">
                        {cert.ipfsHash.slice(0, 8)}...{cert.ipfsHash.slice(-6)}
                      </code>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Địa chỉ ví:</p>
                      {cert.walletAddress ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded block">
                          {cert.walletAddress.slice(0, 6)}...{cert.walletAddress.slice(-4)}
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
