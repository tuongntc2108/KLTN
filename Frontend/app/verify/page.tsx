"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CourseSummary } from "@/components/ai/course-summary"
import {
  Search,
  Upload,
  QrCode,
  Shield,
  CheckCircle,
  FileText,
  Calendar,
  Building,
  User,
  Award,
  ExternalLink,
  Download,
  Sparkles,
} from "lucide-react"

export default function VerifyPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Mock verification function
  const handleVerify = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setVerificationResult({
        isValid: true,
        certificate: {
          id: "CERT-2024-001234",
          name: "Chứng chỉ Tiếng Anh Giao Tiếp - Cấp độ B2",
          holder: "Nguyễn Văn A",
          issuer: "Trung tâm Ngoại ngữ ABC",
          issueDate: "15/11/2024",
          expiryDate: "15/11/2027",
          status: "active",
          tokenId: "0x1a2b3c4d5e6f7890abcdef1234567890",
          blockchainNetwork: "Polygon Mainnet",
          transactionHash: "0xabcdef1234567890abcdef1234567890abcdef12",
          course: {
            name: "English Communication B2",
            duration: "120 giờ",
            description:
              "Khóa học tiếng Anh giao tiếp cấp độ trung cấp cao, tập trung vào kỹ năng nghe, nói, đọc, viết trong các tình huống thực tế.",
            skills: ["Giao tiếp hàng ngày", "Thuyết trình", "Viết email chuyên nghiệp", "Đàm phán cơ bản"],
            grade: "Xuất sắc (9.2/10)",
          },
          verificationHistory: [
            { date: "15/11/2024", action: "Chứng chỉ được cấp", status: "issued" },
            { date: "16/11/2024", action: "Học viên nhận chứng chỉ", status: "claimed" },
            { date: "20/11/2024", action: "Xác minh lần đầu", status: "verified" },
          ],
        },
      })
      setIsLoading(false)
    }, 1500)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Handle PDF upload and extract certificate info
      console.log("Uploaded file:", file.name)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 bg-secondary/10 rounded-full mx-auto mb-4">
          <Shield className="w-8 h-8 text-secondary" />
        </div>
        <h1 className="text-4xl font-bold text-balance">Xác minh chứng chỉ số</h1>
        <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
          Kiểm tra tính hợp lệ và xác thực chứng chỉ của ứng viên một cách nhanh chóng và chính xác
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Tra cứu chứng chỉ
          </CardTitle>
          <CardDescription>Nhập mã chứng chỉ, Token ID hoặc tải lên file PDF để xác minh</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search">Tìm kiếm</TabsTrigger>
              <TabsTrigger value="upload">Tải file PDF</TabsTrigger>
              <TabsTrigger value="qr">Quét mã QR</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Nhập mã chứng chỉ hoặc Token ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleVerify} disabled={isLoading}>
                  {isLoading ? "Đang xác minh..." : "Xác minh"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Ví dụ: CERT-2024-001234 hoặc 0x1a2b3c4d5e6f7890...</p>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tải lên file chứng chỉ PDF</h3>
                <p className="text-muted-foreground mb-4">Kéo thả file PDF hoặc click để chọn file</p>
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" id="pdf-upload" />
                <Button asChild variant="outline">
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    Chọn file PDF
                  </label>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Quét mã QR chứng chỉ</h3>
                <p className="text-muted-foreground mb-4">Sử dụng camera để quét mã QR từ chứng chỉ</p>
                <Button variant="outline">Mở camera</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Verification Result */}
      {verificationResult && (
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Chứng chỉ hợp lệ</h3>
                  <p className="text-green-600">Chứng chỉ đã được xác minh thành công trên blockchain</p>
                </div>
                <Badge className="ml-auto bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Có hiệu lực
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Certificate Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Thông tin chứng chỉ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tên chứng chỉ</p>
                    <p className="text-lg font-semibold">{verificationResult.certificate.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Người nhận</p>
                    <p className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {verificationResult.certificate.holder}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Đơn vị cấp</p>
                    <p className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      {verificationResult.certificate.issuer}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ngày cấp</p>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {verificationResult.certificate.issueDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ngày hết hạn</p>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {verificationResult.certificate.expiryDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mã chứng chỉ</p>
                    <p className="font-mono text-sm">{verificationResult.certificate.id}</p>
                  </div>
                </div>
              </div>

              {/* Blockchain Info */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Thông tin Blockchain</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Token ID</p>
                    <p className="font-mono break-all">{verificationResult.certificate.tokenId}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Mạng Blockchain</p>
                    <p>{verificationResult.certificate.blockchainNetwork}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-3 bg-transparent">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Xem trên Blockchain Explorer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Course Information with AI Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Thông tin khóa học
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{verificationResult.certificate.course.name}</h4>
                <p className="text-muted-foreground mb-3">{verificationResult.certificate.course.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Thời lượng</p>
                  <p>{verificationResult.certificate.course.duration}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Kết quả</p>
                  <p>{verificationResult.certificate.course.grade}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Kỹ năng đạt được</p>
                <div className="flex flex-wrap gap-2">
                  {verificationResult.certificate.course.skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <CourseSummary courseData={verificationResult.certificate.course} />

          {/* Verification History */}
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử xác minh</CardTitle>
              <CardDescription>Các hoạt động liên quan đến chứng chỉ này</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {verificationResult.certificate.verificationHistory.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-secondary/20 rounded-full">
                      <CheckCircle className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Tải báo cáo xác minh
            </Button>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              In kết quả
            </Button>
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Chia sẻ kết quả
            </Button>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="w-8 h-8 text-secondary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Bảo mật tuyệt đối</h3>
            <p className="text-sm text-muted-foreground">Xác minh trực tiếp trên blockchain, không thể giả mạo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Sparkles className="w-8 h-8 text-secondary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Tóm tắt AI thông minh</h3>
            <p className="text-sm text-muted-foreground">AI phân tích và tóm tắt nội dung đào tạo cho nhà tuyển dụng</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 text-secondary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Xác minh tức thì</h3>
            <p className="text-sm text-muted-foreground">
              Kết quả xác minh ngay lập tức, tiết kiệm thời gian tuyển dụng
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
