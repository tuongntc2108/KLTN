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
  Mail,
  Phone,
  Calendar,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Eye,
  Edit,
} from "lucide-react"

const students = [
  {
    id: "1",
    name: "Nguyễn Văn An",
    email: "an.nguyen@email.com",
    phone: "0901234567",
    avatar: "/placeholder.svg?height=40&width=40",
    joinDate: "2024-01-15",
    totalCertificates: 3,
    activeCertificates: 2,
    expiredCertificates: 1,
    courses: ["Digital Marketing", "Data Analytics", "Project Management"],
    walletAddress: "0x742d35Cc6634C0532925a3b8D4C9db96590b4077",
    status: "active",
  },
  {
    id: "2",
    name: "Trần Thị Bình",
    email: "binh.tran@email.com",
    phone: "0912345678",
    avatar: "/placeholder.svg?height=40&width=40",
    joinDate: "2024-02-20",
    totalCertificates: 2,
    activeCertificates: 2,
    expiredCertificates: 0,
    courses: ["English Communication", "Presentation Skills"],
    walletAddress: "0x8ba1f109551bD432803012645Hac136c30C6213",
    status: "active",
  },
  {
    id: "3",
    name: "Lê Minh Cường",
    email: "cuong.le@email.com",
    phone: "0923456789",
    avatar: "/placeholder.svg?height=40&width=40",
    joinDate: "2024-03-10",
    totalCertificates: 1,
    activeCertificates: 0,
    expiredCertificates: 0,
    courses: ["Web Development"],
    walletAddress: null,
    status: "pending",
  },
]

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [courseFilter, setCourseFilter] = useState("all")

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || student.status === statusFilter
    const matchesCourse =
      courseFilter === "all" ||
      student.courses.some((course) => course.toLowerCase().includes(courseFilter.toLowerCase()))

    return matchesSearch && matchesStatus && matchesCourse
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
      case "pending":
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Chờ xử lý
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Không hoạt động
          </Badge>
        )
      default:
        return <Badge variant="outline">Không xác định</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Học viên</h1>
          <p className="text-muted-foreground">Quản lý thông tin học viên và theo dõi tiến độ học tập</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Thêm học viên
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng học viên</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">+2 từ tháng trước</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.filter((s) => s.status === "active").length}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((students.filter((s) => s.status === "active").length / students.length) * 100)}% tổng số
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chứng chỉ đã cấp</CardTitle>
            <Award className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.reduce((sum, s) => sum + s.totalCertificates, 0)}</div>
            <p className="text-xs text-muted-foreground">
              Trung bình {(students.reduce((sum, s) => sum + s.totalCertificates, 0) / students.length).toFixed(1)}{" "}
              chứng chỉ/học viên
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ kết nối ví</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.filter((s) => !s.walletAddress).length}</div>
            <p className="text-xs text-muted-foreground">Cần hướng dẫn kết nối</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Học viên</CardTitle>
          <CardDescription>Tìm kiếm và lọc học viên theo các tiêu chí khác nhau</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Tìm kiếm theo tên hoặc email..."
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
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="inactive">Không hoạt động</SelectItem>
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Khóa học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả khóa học</SelectItem>
                <SelectItem value="digital">Digital Marketing</SelectItem>
                <SelectItem value="english">English Communication</SelectItem>
                <SelectItem value="web">Web Development</SelectItem>
                <SelectItem value="data">Data Analytics</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Xuất Excel
            </Button>
          </div>

          {/* Students List */}
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={student.avatar || "/placeholder.svg"} alt={student.name} />
                      <AvatarFallback>
                        {student.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{student.name}</h3>
                        {getStatusBadge(student.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {student.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {student.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Tham gia: {new Date(student.joinDate).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="font-medium">{student.totalCertificates} chứng chỉ</div>
                      <div className="text-muted-foreground">
                        {student.activeCertificates} hoạt động, {student.expiredCertificates} hết hạn
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Xem
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Sửa
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium mb-1">Khóa học đã tham gia:</p>
                      <div className="flex flex-wrap gap-1">
                        {student.courses.map((course, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {course}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium mb-1">Địa chỉ ví:</p>
                      {student.walletAddress ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {student.walletAddress.slice(0, 6)}...{student.walletAddress.slice(-4)}
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
