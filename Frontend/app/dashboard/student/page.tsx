import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Chào mừng trở lại!</h1>
          <p className="text-muted-foreground">Quản lý chứng chỉ số và ví blockchain của bạn</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Wallet className="w-4 h-4 mr-2" />
            Kết nối ví
          </Button>
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
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2</span> chứng chỉ mới tháng này
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang có hiệu lực</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10</div>
            <p className="text-xs text-muted-foreground">83% tổng số chứng chỉ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ nhận</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Cần cập nhật địa chỉ ví</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sắp hết hạn</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
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
              {[
                {
                  name: "Chứng chỉ Tiếng Anh Giao Tiếp",
                  issuer: "Trung tâm ABC",
                  date: "15/11/2024",
                  status: "active",
                  tokenId: "0x1a2b3c...",
                },
                {
                  name: "Kỹ năng Thuyết trình Nâng cao",
                  issuer: "Học viện XYZ",
                  date: "10/11/2024",
                  status: "active",
                  tokenId: "0x4d5e6f...",
                },
                {
                  name: "Digital Marketing Cơ bản",
                  issuer: "Trung tâm DEF",
                  date: "05/11/2024",
                  status: "pending",
                  tokenId: "0x7g8h9i...",
                },
              ].map((cert, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
                      <Award className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cert.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cert.issuer} • {cert.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cert.status === "active" ? "default" : "secondary"}>
                      {cert.status === "active" ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <Clock className="w-3 h-3 mr-1" />
                      )}
                      {cert.status === "active" ? "Có hiệu lực" : "Chờ nhận"}
                    </Badge>
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
              ))}
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
                <p className="text-xs text-muted-foreground font-mono">0x742d35Cc6634C0532925a3b8D4...</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="text-sm font-medium">Mạng blockchain</p>
                <p className="text-xs text-muted-foreground">Polygon Mainnet</p>
              </div>
              <Badge variant="default">
                <CheckCircle className="w-3 h-3 mr-1" />
                Đã kết nối
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="text-sm font-medium">Số dư ví</p>
                <p className="text-xs text-muted-foreground">0.05 MATIC</p>
              </div>
              <Button variant="outline" size="sm">
                Nạp tiền
              </Button>
            </div>

            <Button className="w-full">
              <QrCode className="w-4 h-4 mr-2" />
              Tạo mã QR chia sẻ
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác nhanh</CardTitle>
          <CardDescription>Các tác vụ thường dùng cho học viên</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <Download className="w-6 h-6" />
              <span>Tải chứng chỉ PDF</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <Share className="w-6 h-6" />
              <span>Chia sẻ với NTD</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <QrCode className="w-6 h-6" />
              <span>Tạo mã QR</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <Wallet className="w-6 h-6" />
              <span>Cài đặt ví</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
