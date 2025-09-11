import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
} from "lucide-react"

export default function StudentCertificates() {
  const certificates = [
    {
      id: 1,
      name: "Chứng chỉ Tiếng Anh Giao Tiếp - Cấp độ B2",
      issuer: "Trung tâm Ngoại ngữ ABC",
      issueDate: "15/11/2024",
      expiryDate: "15/11/2027",
      status: "active",
      tokenId: "0x1a2b3c4d5e6f7890",
      description: "Chứng nhận khả năng giao tiếp tiếng Anh ở mức độ trung cấp cao",
      course: "English Communication B2",
      grade: "Xuất sắc",
    },
    {
      id: 2,
      name: "Kỹ năng Thuyết trình Nâng cao",
      issuer: "Học viện Phát triển Kỹ năng XYZ",
      issueDate: "10/11/2024",
      expiryDate: "10/11/2026",
      status: "active",
      tokenId: "0x4d5e6f7890123456",
      description: "Chứng nhận kỹ năng thuyết trình và trình bày chuyên nghiệp",
      course: "Advanced Presentation Skills",
      grade: "Giỏi",
    },
    {
      id: 3,
      name: "Digital Marketing Cơ bản",
      issuer: "Trung tâm Đào tạo DEF",
      issueDate: "05/11/2024",
      expiryDate: "05/11/2025",
      status: "pending",
      tokenId: "0x7g8h9i0123456789",
      description: "Kiến thức cơ bản về marketing số và các công cụ digital",
      course: "Digital Marketing Fundamentals",
      grade: "Khá",
    },
    {
      id: 4,
      name: "Quản lý Dự án Agile",
      issuer: "Viện Công nghệ PQR",
      issueDate: "28/10/2024",
      expiryDate: "28/10/2026",
      status: "active",
      tokenId: "0xabcdef1234567890",
      description: "Chứng nhận hiểu biết về phương pháp quản lý dự án Agile",
      course: "Agile Project Management",
      grade: "Xuất sắc",
    },
    {
      id: 5,
      name: "Kỹ năng Lãnh đạo",
      issuer: "Trung tâm ABC",
      issueDate: "15/09/2024",
      expiryDate: "15/09/2025",
      status: "expiring",
      tokenId: "0x1122334455667788",
      description: "Phát triển kỹ năng lãnh đạo và quản lý nhóm",
      course: "Leadership Skills Development",
      grade: "Giỏi",
    },
    {
      id: 6,
      name: "An toàn Thông tin Cơ bản",
      issuer: "Học viện Bảo mật STU",
      issueDate: "20/08/2024",
      expiryDate: "20/08/2025",
      status: "revoked",
      tokenId: "0x9988776655443322",
      description: "Kiến thức cơ bản về an toàn và bảo mật thông tin",
      course: "Information Security Basics",
      grade: "Khá",
    },
  ]

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Chứng chỉ của tôi</h1>
          <p className="text-muted-foreground">Quản lý và chia sẻ các chứng chỉ số của bạn</p>
        </div>
        <div className="flex gap-3">
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
              <Input placeholder="Tìm kiếm chứng chỉ..." className="pl-10" />
            </div>
            <Button variant="outline" className="sm:w-auto bg-transparent">
              <Filter className="w-4 h-4 mr-2" />
              Lọc theo trạng thái
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Certificates Grid */}
      <div className="grid gap-6">
        {certificates.map((cert) => (
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

      {/* Empty State (if no certificates) */}
      {certificates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Chưa có chứng chỉ nào</h3>
            <p className="text-muted-foreground text-center mb-4">
              Bạn chưa có chứng chỉ nào. Hãy tham gia các khóa học để nhận chứng chỉ đầu tiên!
            </p>
            <Button>Khám phá khóa học</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
