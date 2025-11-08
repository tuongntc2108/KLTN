"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import {
  Users,
  Award,
  BookOpen,
  TrendingUp,
  Plus,
  MoreHorizontal,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  XCircle,
  RefreshCw,
} from "lucide-react"

export default function TrainingDashboard() {
  const router = useRouter()
  const { stats, recentCertificates, recentStudents, loading, error, refreshData } = useDashboardStats()

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
          <AlertCircle className="h-8 w-8 text-red-500 mb-2 mx-auto" />
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
          <h1 className="text-3xl font-bold text-balance">Dashboard</h1>
          <p className="text-muted-foreground">Chào mừng trở lại! Đây là tổng quan hoạt động của trung tâm đào tạo.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push('/dashboard/training/certificates/issue')}>
            <Plus className="w-4 h-4 mr-2" />
            Cấp chứng chỉ mới
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng học viên</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={stats.studentsGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                {stats.studentsGrowth >= 0 ? '+' : ''}{stats.studentsGrowth}%
              </span> so với tháng trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chứng chỉ đã cấp</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCertificatesIssued.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={stats.certificatesGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                {stats.certificatesGrowth >= 0 ? '+' : ''}{stats.certificatesGrowth}%
              </span> so với tháng trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số khóa học</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={stats.coursesGrowth >= 0 ? "text-blue-600" : "text-red-600"}>
                {stats.coursesGrowth >= 0 ? '+' : ''}{stats.coursesGrowth}
              </span> khóa mới tuần này
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chứng chỉ đang hoạt động</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCertificates.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className={stats.activeCertificatesGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                {stats.activeCertificatesGrowth >= 0 ? '+' : ''}{stats.activeCertificatesGrowth}%
              </span> so với tháng trước
            </p>
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
                <CardDescription>Các chứng chỉ được cấp trong 7 ngày qua</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCertificates.length > 0 ? (
                recentCertificates.map((cert) => {
                  const issueDate = new Date(cert.issue_date)
                  const now = new Date()
                  const diffTime = Math.abs(now.getTime() - issueDate.getTime())
                  const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
                  const diffDays = Math.floor(diffHours / 24)
                  
                  let timeAgo = ''
                  if (diffDays > 0) {
                    timeAgo = `${diffDays} ngày trước`
                  } else if (diffHours > 0) {
                    timeAgo = `${diffHours} giờ trước`
                  } else {
                    timeAgo = 'Vừa mới'
                  }

                  return (
                    <div key={cert.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/20">
                          <Award className="h-4 w-4 text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{cert.student_name}</p>
                          <p className="text-xs text-muted-foreground">{cert.course_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          switch (cert.status?.toLowerCase()) {
                            case "active":
                              return (
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Đã cấp
                                </Badge>
                              )
                            case "pending":
                              return (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Chờ nhận
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
                            case "replaced":
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
                                  {cert.status}
                                </Badge>
                              )
                          }
                        })()}
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Chưa có chứng chỉ nào được cấp gần đây</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Students */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Học viên mới tạo</CardTitle>
                <CardDescription>Các học viên đăng ký trong 7 ngày qua</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentStudents.length > 0 ? (
                recentStudents.map((student) => {
                  const createdDate = new Date(student.created_at)
                  const now = new Date()
                  const diffTime = Math.abs(now.getTime() - createdDate.getTime())
                  const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
                  const diffDays = Math.floor(diffHours / 24)
                  
                  let timeAgo = ''
                  if (diffDays > 0) {
                    timeAgo = `${diffDays} ngày trước`
                  } else if (diffHours > 0) {
                    timeAgo = `${diffHours} giờ trước`
                  } else {
                    timeAgo = 'Vừa mới'
                  }

                  return (
                    <div key={student.student_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={student.has_wallet ? "default" : "secondary"}>
                          {student.has_wallet ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {student.has_wallet ? "Có ví" : "Chưa có ví"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Chưa có học viên mới nào đăng ký gần đây</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
