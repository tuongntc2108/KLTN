import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"

export default function TrainingDashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Dashboard</h1>
          <p className="text-muted-foreground">Chào mừng trở lại! Đây là tổng quan hoạt động của trung tâm đào tạo.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Báo cáo
          </Button>
          <Button>
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
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> so với tháng trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chứng chỉ đã cấp</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">856</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8%</span> so với tháng trước
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Khóa học đang mở</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">3 khóa mới</span> tuần này
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ hoàn thành</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.5%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1%</span> so với tháng trước
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
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  student: "Nguyễn Văn A",
                  course: "Tiếng Anh Giao Tiếp",
                  date: "2 giờ trước",
                  status: "active",
                },
                {
                  student: "Trần Thị B",
                  course: "Kỹ năng Thuyết trình",
                  date: "5 giờ trước",
                  status: "active",
                },
                {
                  student: "Lê Văn C",
                  course: "Quản lý Dự án",
                  date: "1 ngày trước",
                  status: "pending",
                },
                {
                  student: "Phạm Thị D",
                  course: "Digital Marketing",
                  date: "2 ngày trước",
                  status: "active",
                },
              ].map((cert, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/20">
                      <Award className="h-4 w-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cert.student}</p>
                      <p className="text-xs text-muted-foreground">{cert.course}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cert.status === "active" ? "default" : "secondary"}>
                      {cert.status === "active" ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <Clock className="w-3 h-3 mr-1" />
                      )}
                      {cert.status === "active" ? "Đã cấp" : "Chờ nhận"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{cert.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Courses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Khóa học đang diễn ra</CardTitle>
                <CardDescription>Các khóa học hiện tại và trạng thái</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  name: "Tiếng Anh Giao Tiếp - Cơ bản",
                  students: 28,
                  progress: 75,
                  endDate: "15/12/2024",
                  status: "active",
                },
                {
                  name: "Kỹ năng Thuyết trình",
                  students: 15,
                  progress: 45,
                  endDate: "20/12/2024",
                  status: "active",
                },
                {
                  name: "Digital Marketing Nâng cao",
                  students: 22,
                  progress: 90,
                  endDate: "10/12/2024",
                  status: "ending",
                },
                {
                  name: "Quản lý Dự án Agile",
                  students: 18,
                  progress: 30,
                  endDate: "25/12/2024",
                  status: "active",
                },
              ].map((course, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{course.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.students} học viên • Kết thúc {course.endDate}
                      </p>
                    </div>
                    <Badge variant={course.status === "ending" ? "destructive" : "default"}>
                      {course.status === "ending" ? (
                        <AlertCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      )}
                      {course.status === "ending" ? "Sắp kết thúc" : "Đang diễn ra"}
                    </Badge>
                  </div>
                  <div className="w-full bg-secondary/20 rounded-full h-2">
                    <div
                      className="bg-secondary h-2 rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">{course.progress}% hoàn thành</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác nhanh</CardTitle>
          <CardDescription>Các tác vụ thường dùng trong quản lý đào tạo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <Plus className="w-6 h-6" />
              <span>Thêm học viên mới</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <BookOpen className="w-6 h-6" />
              <span>Tạo khóa học</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <Award className="w-6 h-6" />
              <span>Cấp chứng chỉ</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <TrendingUp className="w-6 h-6" />
              <span>Xem báo cáo</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
