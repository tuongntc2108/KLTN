"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useStudentDashboard } from "@/hooks/use-student-dashboard"
import Link from "next/link"
import {
  Award,
  Wallet,
  Download,
  Share,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Copy,
  QrCode,
  Loader2,
  RefreshCw,
  XCircle,
  Upload,
} from "lucide-react"

export default function StudentDashboard() {
  const { stats, recentCertificates, walletInfo, loading, error, refreshData } = useStudentDashboard()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Có hiệu lực
          </Badge>
        )
      case "Issued":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Chờ nhận
          </Badge>
        )
      case "Expired":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Đã hết hạn
          </Badge>
        )
      case "Revoked":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Đã thu hồi
          </Badge>
        )
      case "Replaced":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
            <RefreshCw className="w-3 h-3 mr-1" />
            Đã thay thế
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2 mx-auto" />
          <p className="text-red-500">{error}</p>
          <Button onClick={refreshData} className="mt-2">
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Chào mừng trở lại!</h1>
          <p className="text-muted-foreground">Quản lý chứng chỉ số và ví blockchain của bạn</p>
        </div>
        <div className="flex gap-3">
          <Button>
            <Share className="w-4 h-4 mr-2" />
            Chia sẻ hồ sơ
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng chứng chỉ</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCertificates}</div>
            <p className="text-xs text-muted-foreground">
              Tổng số chứng chỉ của bạn
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang có hiệu lực</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCertificates}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCertificates > 0 ? 
                `${Math.round((stats.activeCertificates / stats.totalCertificates) * 100)}% tổng số chứng chỉ` : 
                '0% tổng số chứng chỉ'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ nhận</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCertificates}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingCertificates > 0 ? 'Cần cập nhật địa chỉ ví' : 'Tất cả đã được nhận'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sắp hết hạn</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringCertificates}</div>
            <p className="text-xs text-muted-foreground">Trong 30 ngày tới</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Certificates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Chứng chỉ gần đây</CardTitle>
                <CardDescription>Các chứng chỉ được cấp gần đây nhất</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <a href="/dashboard/student/certificates">
                  Xem tất cả
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCertificates.length > 0 ? (
                recentCertificates.map((cert) => {
                  const issueDate = new Date(cert.issue_date)
                  const formattedDate = issueDate.toLocaleDateString('vi-VN')
                  
                  return (
                    <div key={cert.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
                          <Award className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{cert.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {cert.issuer} • {formattedDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(cert.status)}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Share className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Chưa có chứng chỉ nào</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Wallet Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Trạng thái ví Blockchain</CardTitle>
                <CardDescription>Thông tin ví và kết nối blockchain</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <Wallet className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="text-sm font-medium">Địa chỉ ví</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {walletInfo.address ? 
                    `${walletInfo.address.slice(0, 6)}...${walletInfo.address.slice(-4)}` : 
                    'Chưa kết nối ví'
                  }
                </p>
              </div>
              {walletInfo.address && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="text-sm font-medium">Mạng blockchain</p>
                <p className="text-xs text-muted-foreground">{walletInfo.network}</p>
              </div>
              <Badge variant={walletInfo.isConnected ? "default" : "secondary"}>
                {walletInfo.isConnected ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : (
                  <Clock className="w-3 h-3 mr-1" />
                )}
                {walletInfo.isConnected ? "Đã kết nối" : "Chưa kết nối"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="text-sm font-medium">Số dư ví</p>
                <p className="text-xs text-muted-foreground">{walletInfo.balance}</p>
              </div>
              {walletInfo.isConnected && (
                <Button variant="outline" size="sm">
                  Nạp tiền
                </Button>
              )}
            </div>

            {walletInfo.isConnected ? (
              <Button className="w-full">
                <QrCode className="w-4 h-4 mr-2" />
                Tạo mã QR chia sẻ
              </Button>
            ) : (
              <Button className="w-full" variant="outline">
                <Wallet className="w-4 h-4 mr-2" />
                Kết nối ví MetaMask
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
