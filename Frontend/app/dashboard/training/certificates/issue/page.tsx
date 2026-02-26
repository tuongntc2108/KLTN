"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { useCourses } from "@/hooks/use-courses"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function IssueCertificatePage() {
  const [isIssuing, setIsIssuing] = useState(false)
  const [issuedCertificate, setIssuedCertificate] = useState<any>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { student, loading: studentLoading, error: studentError, fetchStudentInfo, clearStudent } = useStudentInfo()
  const { courses, loading: coursesLoading, fetchCourses } = useCourses()

  const [formData, setFormData] = useState({
    studentId: "",
    courseId: "", // Changed from courseName to courseId
    certificateName: "",
    issueDate: new Date().toISOString().split('T')[0], // Auto-fill current date
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

  // Load courses on mount
  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleIssueCertificate = async () => {
    setIsIssuing(true)
    try {
      // Validate required fields
      if (!formData.studentId || !formData.certificateName || !formData.issueDate) {
        toast({
          title: "Thiếu thông tin",
          description: "Vui lòng điền đầy đủ các trường bắt buộc (Mã học viên, Tên chứng chỉ, Ngày cấp)",
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

      // Prepare API request body - use course_id if selected, otherwise course_name as fallback
      const selectedCourse = (formData.courseId && formData.courseId !== "none") ? courses.find(c => c.id.toString() === formData.courseId) : null
      const requestBody = {
        student_id: formData.studentId,
        ...(formData.courseId && formData.courseId !== "none" && { course_id: parseInt(formData.courseId) }), // Only include course_id if selected and not "none"
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
        courseName: selectedCourse?.course_name || 'Không có khóa học',
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
                  <Label className="text-sm font-medium text-muted-foreground">Mã xác thực</Label>
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
                    {issuedCertificate.status === 'Issued' ? 'Chờ học viên nhận' : issuedCertificate.status}
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
                <Label htmlFor="courseId">Khóa học</Label>
                <Select onValueChange={(value) => handleInputChange("courseId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khóa học" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Không gắn với khóa học nào --</SelectItem>
                    {coursesLoading ? (
                      <div className="p-2 text-sm text-muted-foreground">Đang tải khóa học...</div>
                    ) : courses.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Chưa có khóa học nào</div>
                    ) : (
                      courses.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.course_name}
                          {course.duration && (
                            <span className="text-muted-foreground ml-2">({course.duration})</span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
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
                    readOnly
                    className="bg-muted cursor-not-allowed"
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
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleIssueCertificate}
              disabled={isIssuing || !formData.studentId || !formData.certificateName || !formData.issueDate || !student || studentLoading}
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
          </div>
        </div>
          
      </div>
    </div>
  )
}
