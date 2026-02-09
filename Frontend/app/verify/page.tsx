"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AISummaryButton } from "@/components/ai/ai-summary-button"
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

import { VerificationResult } from "@/components/verify/verification-result"

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

      const response = await fetch(endpoint)
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

      if (!certificate) {
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
          revocation_reason: certificate.revocation_reason || null,
          events: Array.isArray(certificate.events) ? certificate.events : [],
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
          <CardDescription>Nhập mã xác thực hoặc Token ID để xác minh</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="search" className="w-full">
            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Nhập mã xác thực hoặc Token ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleVerify} disabled={isLoading}>
                  {isLoading ? "Đang xác minh..." : "Xác minh"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Ví dụ: mã xác thực hoặc Token ID (số hoặc hash...)</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Verification Result */}
      {verificationResult && (
        <VerificationResult verificationResult={verificationResult} />
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
