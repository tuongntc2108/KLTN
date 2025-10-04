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

  // Real verification function
  const handleVerify = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    
    try {
      // Determine if input is verification code or token ID
      const isTokenId = searchQuery.startsWith('0x') || /^\d+$/.test(searchQuery)
      const endpoint = isTokenId 
        ? `/api/verify/by-token/${searchQuery}`
        : `/api/verify/by-code/${searchQuery}`

      const response = await fetch(`/api/verify${endpoint}`)
      const data = await response.json()
      
      console.log('API Response:', data) // Debug log
      console.log('Success:', data.success)
      console.log('Verified:', data.data?.verified)
      console.log('Certificate:', data.data?.certificate)

      if (!response.ok) {
        setVerificationResult({
          isValid: false,
          message: data.message || 'Verification failed'
        })
        setIsLoading(false)
        return
      }

      // Handle the new API response format: { success, message, data: { verified, certificate } }
      const isValid = data.success && data.data?.verified
      const certificate = data.data?.certificate
      
      if (!isValid || !certificate) {
        setVerificationResult({
          isValid: false,
          message: data.message || 'Chứng chỉ không hợp lệ'
        })
        setIsLoading(false)
        return
      }

      // Fetch metadata from IPFS if available
      let metadata = null
      if (certificate?.metadata_uri) {
        try {
          const metadataResponse = await fetch(certificate.metadata_uri)
          if (metadataResponse.ok) {
            metadata = await metadataResponse.json()
          }
        } catch (error) {
          console.warn('Failed to fetch metadata:', error)
        }
      }

      // Format the result according to UI requirements
      const formatDate = (dateString: string) => {
        if (!dateString) return 'Chưa xác định'
        const date = new Date(dateString)
        return date.toLocaleDateString('vi-VN')
      }

      // Extract information from the new API response structure
      const courseName = certificate.certificate_detail?.course_name || 'Chưa xác định'
      const issuerName = certificate.issuer?.name || 'Chưa xác định'
      const certificateName = certificate.certificate_detail?.certificate_name || 'Chưa xác định'
      const recipientName = certificate.recipient?.full_name || 'Chưa xác định'
      
      setVerificationResult({
        isValid: isValid,
        certificate: {
          id: certificate.token_id,
          name: certificateName,
          holder: recipientName,
          issuer: issuerName,
          issueDate: formatDate(certificate.certificate_detail?.issue_date),
          expiryDate: formatDate(certificate.certificate_detail?.expire_date),
          status: certificate.status || 'unknown',
          tokenId: certificate.token_id,
          blockchainNetwork: "Sepolia Testnet",
          verificationCode: certificate.verification_code || certificate.token_id,
          course: {
            name: courseName,
            description: metadata?.description || 'Mô tả khóa học chưa có sẵn',
          },
        },
        statusMessage: data.message
      })
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationResult({
        isValid: false,
        message: 'Có lỗi xảy ra khi xác minh chứng chỉ'
      })
    }
    
    setIsLoading(false)
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
          <CardDescription>Nhập mã chứng chỉ hoặc Token ID để xác minh</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="search" className="w-full">
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
              <p className="text-sm text-muted-foreground">Ví dụ: mã xác thực hoặc Token ID (số hoặc 0x...)</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Verification Result */}
      {verificationResult && (
        <div className="space-y-6">
          {/* Status Card */}
          {verificationResult.isValid ? (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Chứng chỉ hợp lệ</h3>
                    <p className="text-green-900">{verificationResult.statusMessage || 'Chứng chỉ đã được xác minh thành công trên blockchain'}</p>
                  </div>
                  <Badge className="ml-auto bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Có hiệu lực
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-800">Chứng chỉ không hợp lệ</h3>
                    <p className="text-red-900">{verificationResult.message || 'Không thể xác minh chứng chỉ'}</p>
                  </div>
                  <Badge className="ml-auto bg-red-100 text-red-800 border-red-200">
                    Không hợp lệ
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certificate Details */}
          {verificationResult.isValid && verificationResult.certificate && (
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
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Mã chứng chỉ</p>
                      <p className="font-mono text-sm">{verificationResult.certificate.verificationCode || verificationResult.certificate.id}</p>
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
                      <p className="text-sm font-medium text-muted-foreground">Token ID</p>
                      <p className="font-mono text-sm break-all">{verificationResult.certificate.tokenId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Mạng Blockchain</p>
                      <p>{verificationResult.certificate.blockchainNetwork}</p>
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
          )}

          {/* Course Information */}
          {verificationResult.isValid && verificationResult.certificate?.course && (
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
              </CardContent>
            </Card>
          )}

          {/* AI Course Summary - Optional */}
          {verificationResult.isValid && verificationResult.certificate?.course && (
            <CourseSummary courseData={verificationResult.certificate.course} />
          )}



          {/* Actions */}
          {verificationResult.isValid && (
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
          )}
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
