"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Award, Upload, Loader2, CheckCircle, User, Calendar, FileText, Blocks, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useStudentInfo } from "@/hooks/use-student-info"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function IssueCertificatePage() {
  const [isIssuing, setIsIssuing] = useState(false)
  const [issuedCertificate, setIssuedCertificate] = useState<any>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { student, loading: studentLoading, error: studentError, fetchStudentInfo, clearStudent } = useStudentInfo()

  const [formData, setFormData] = useState({
    studentId: "",
    courseName: "",
    certificateName: "",
    issueDate: "",
    expiryDate: "",
    description: "",
    grade: "",
    courseType: "",
    issuerName: "VNU University",
    issuerId: "VNU-001",
    issuerUrl: "https://vnu.edu.vn",
  })

  // Add useEffect to handle student ID changes with debouncing
  useEffect(() => {
    if (formData.studentId.trim() === "") {
      clearStudent()
      return
    }
    
    // Debounce the API call
    const timeoutId = setTimeout(() => {
      fetchStudentInfo(formData.studentId.trim())
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [formData.studentId, clearStudent, fetchStudentInfo])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleIssueCertificate = async () => {
    setIsIssuing(true)
    try {
      // Validate required fields
      if (!formData.studentId || !formData.certificateName || !formData.courseName || !formData.issueDate) {
        toast({
          title: "Thiếu thông tin",
          description: "Vui lòng điền đầy đủ các trường bắt buộc",
          variant: "destructive",
        })
        return
      }
      
      // Validate student information is loaded
      if (!student) {
        toast({
          title: "Thông tin học viên chưa được tìm thấy",
          description: "Vui lòng nhập mã học viên hợp lệ và chờ thông tin tải về",
          variant: "destructive",
        })
        return
      }

      // Generate SHA256 hash for verification (simplified)
      const sha256Hash = `hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const pdfIpfsHash = `Qm${Math.random().toString(36).substr(2, 44)}`

      // Prepare API request body - only need student_id now
      const requestBody = {
        student_id: formData.studentId,
        course_name: formData.courseName,
        certificate_name: formData.certificateName,
        issuer_name: formData.issuerName,
        issuer_id: formData.issuerId,
        issuer_url: formData.issuerUrl,
        issued_date: formData.issueDate,
        expire_date: formData.expiryDate || null,
        sha256_hash: sha256Hash,
        pdf_ipfs_hash: pdfIpfsHash,
      }

      // Call mint certificate API
      const response = await fetch('/api/certificates', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mint certificate')
      }

      const result = await response.json()

      const certificate = {
        id: `CERT-${result.certificate_id}`,
        tokenId: result.token_id,
        transactionHash: result.transaction_hash || `0x${Math.random().toString(16).substr(2, 64)}`,
        ipfsHash: result.metadata_uri,
        status: result.status,
        studentId: formData.studentId,
        courseName: formData.courseName,
        certificateName: formData.certificateName,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
      }

      setIssuedCertificate(certificate)
      toast({
        title: "Cấp chứng chỉ thành công",
        description: "Chứng chỉ NFT đã được tạo và ghi lên blockchain",
      })
    } catch (error) {
      console.error('Error minting certificate:', error)
      toast({
        title: "Lỗi cấp chứng chỉ",
        description: (error as Error)?.message || "Không thể cấp chứng chỉ. Vui lòng thử lại.",
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
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Metadata URI</Label>
                  <p className="font-mono text-xs break-all">{issuedCertificate.ipfsHash}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">IPFS Hash</Label>
                  <p className="font-mono text-sm">{issuedCertificate.ipfsHash}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Học viên</Label>
                  <p>Mã SV: {issuedCertificate.studentId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Trạng thái</Label>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {issuedCertificate.status === 'issued_not_claimed' ? 'Chờ học viên nhận' : issuedCertificate.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button>Xem trên Blockchain Explorer</Button>
              <Button variant="outline">Gửi thông báo cho học viên</Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/training/certificates?refresh=true')}
              >
                Quay về Dashboard
              </Button>
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
              {/* First row: Student ID and Name */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentId">Mã học viên *</Label>
                  <Input
                    id="studentId"
                    value={formData.studentId}
                    onChange={(e) => handleInputChange("studentId", e.target.value)}
                    placeholder="STUDENT001"
                  />
                </div>
                <div>
                  <Label htmlFor="studentName">Họ và tên</Label>
                  <Input
                    id="studentName"
                    value={student?.name || ""}
                    placeholder="Sẽ tự động điền khi nhập mã học viên"
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>
              
              {/* Second row: Email and Wallet Address */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentEmail">Email</Label>
                  <Input
                    id="studentEmail"
                    value={student?.email || ""}
                    placeholder="Sẽ tự động điền khi nhập mã học viên"
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label htmlFor="studentWallet">Địa chỉ ví</Label>
                  <Input
                    id="studentWallet"
                    value={student?.wallet_address || ""}
                    placeholder="Sẽ tự động điền khi nhập mã học viên"
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>
              
              {/* Helper text */}
              <p className="text-sm text-muted-foreground">
                Thông tin sinh viên (họ tên, email, địa chỉ ví) sẽ được tự động truy vấn từ hệ thống
              </p>
              
              {/* Loading indicator */}
              {studentLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tìm kiếm thông tin học viên...
                </div>
              )}
              
              {/* Error message */}
              {studentError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{studentError}</AlertDescription>
                </Alert>
              )}
              
              {/* Wallet warning */}
              {student && !student.wallet_address && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-600">
                    ⚠️ Học viên chưa kết nối ví. Chứng chỉ sẽ chờ cho đến khi học viên kết nối ví.
                  </p>
                </div>
              )}
              
              {/* Student verification status */}
              {student && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <CheckCircle className="w-4 h-4" />
                    Thông tin học viên đã được xác thực
                  </div>
                </div>
              )}
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
              disabled={isIssuing || !formData.studentId || !formData.certificateName || !formData.courseName || !formData.issueDate || !student || studentLoading}
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
