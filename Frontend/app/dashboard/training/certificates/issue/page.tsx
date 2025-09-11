"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Award, Upload, Loader2, CheckCircle, User, Calendar, FileText, Blocks } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function IssueCertificatePage() {
  const [isIssuing, setIsIssuing] = useState(false)
  const [issuedCertificate, setIssuedCertificate] = useState<any>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    studentName: "",
    studentEmail: "",
    studentWallet: "",
    courseName: "",
    certificateName: "",
    issueDate: "",
    expiryDate: "",
    description: "",
    grade: "",
    courseType: "",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleIssueCertificate = async () => {
    setIsIssuing(true)
    try {
      // Simulate certificate issuance process
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const certificate = {
        id: `CERT-${Date.now()}`,
        tokenId: `0x${Math.random().toString(16).substr(2, 16)}`,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        ipfsHash: `Qm${Math.random().toString(36).substr(2, 44)}`,
        ...formData,
      }

      setIssuedCertificate(certificate)
      toast({
        title: "Cấp chứng chỉ thành công",
        description: "Chứng chỉ NFT đã được tạo và gửi đến học viên",
      })
    } catch (error) {
      toast({
        title: "Lỗi cấp chứng chỉ",
        description: "Không thể cấp chứng chỉ. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setIsIssuing(false)
    }
  }

  if (issuedCertificate) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">Cấp chứng chỉ thành công</h1>
          <p className="text-muted-foreground">Chứng chỉ NFT đã được tạo và mint trên blockchain</p>
        </div>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Chứng chỉ đã được cấp</h3>
                <p className="text-green-600">NFT đã được mint thành công trên blockchain</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Mã chứng chỉ</Label>
                  <p className="font-mono text-sm">{issuedCertificate.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Token ID</Label>
                  <p className="font-mono text-sm">{issuedCertificate.tokenId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Transaction Hash</Label>
                  <p className="font-mono text-xs break-all">{issuedCertificate.transactionHash}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">IPFS Hash</Label>
                  <p className="font-mono text-sm">{issuedCertificate.ipfsHash}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Học viên</Label>
                  <p>{issuedCertificate.studentName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Trạng thái</Label>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Chờ học viên nhận</Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button>Xem trên Blockchain Explorer</Button>
              <Button variant="outline">Gửi thông báo cho học viên</Button>
              <Button variant="outline" onClick={() => setIssuedCertificate(null)}>
                Cấp chứng chỉ khác
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-balance">Cấp chứng chỉ NFT</h1>
        <p className="text-muted-foreground">Tạo và cấp chứng chỉ số dưới dạng NFT cho học viên</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Thông tin học viên
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentName">Họ và tên *</Label>
                  <Input
                    id="studentName"
                    value={formData.studentName}
                    onChange={(e) => handleInputChange("studentName", e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <Label htmlFor="studentEmail">Email *</Label>
                  <Input
                    id="studentEmail"
                    type="email"
                    value={formData.studentEmail}
                    onChange={(e) => handleInputChange("studentEmail", e.target.value)}
                    placeholder="student@example.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="studentWallet">Địa chỉ ví blockchain *</Label>
                <Input
                  id="studentWallet"
                  value={formData.studentWallet}
                  onChange={(e) => handleInputChange("studentWallet", e.target.value)}
                  placeholder="0x742d35Cc6634C0532925a3b8D41C71D3d9C8b663"
                />
              </div>
            </CardContent>
          </Card>

          {/* Certificate Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Thông tin chứng chỉ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="certificateName">Tên chứng chỉ *</Label>
                <Input
                  id="certificateName"
                  value={formData.certificateName}
                  onChange={(e) => handleInputChange("certificateName", e.target.value)}
                  placeholder="Chứng chỉ Tiếng Anh Giao Tiếp - Cấp độ B2"
                />
              </div>
              <div>
                <Label htmlFor="courseName">Tên khóa học *</Label>
                <Input
                  id="courseName"
                  value={formData.courseName}
                  onChange={(e) => handleInputChange("courseName", e.target.value)}
                  placeholder="English Communication B2"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="courseType">Loại khóa học</Label>
                  <Select onValueChange={(value) => handleInputChange("courseType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại khóa học" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="language">Ngoại ngữ</SelectItem>
                      <SelectItem value="skills">Kỹ năng mềm</SelectItem>
                      <SelectItem value="technical">Kỹ thuật</SelectItem>
                      <SelectItem value="management">Quản lý</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="grade">Kết quả</Label>
                  <Select onValueChange={(value) => handleInputChange("grade", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kết quả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Xuất sắc</SelectItem>
                      <SelectItem value="good">Giỏi</SelectItem>
                      <SelectItem value="fair">Khá</SelectItem>
                      <SelectItem value="pass">Đạt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Mô tả chương trình đào tạo</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Mô tả chi tiết về nội dung khóa học, kỹ năng đạt được..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Thời gian hiệu lực
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issueDate">Ngày cấp *</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => handleInputChange("issueDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">Ngày hết hạn</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Actions */}
        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Xem trước chứng chỉ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-[3/4] bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                <div className="text-center">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Xem trước chứng chỉ</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Blocks className="w-5 h-5" />
                Thông tin Blockchain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mạng:</span>
                <span>Polygon Mainnet</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Loại token:</span>
                <span>Soulbound Token (SBT)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phí gas ước tính:</span>
                <span>~0.001 MATIC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lưu trữ metadata:</span>
                <span>IPFS</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleIssueCertificate}
              disabled={isIssuing || !formData.studentName || !formData.certificateName}
            >
              {isIssuing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang cấp chứng chỉ...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 mr-2" />
                  Cấp chứng chỉ NFT
                </>
              )}
            </Button>
            <Button variant="outline" className="w-full bg-transparent">
              <Upload className="w-4 h-4 mr-2" />
              Tải template
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
