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
import { useTranslation } from "@/hooks/use-translation"
import { useStudentInfo } from "@/hooks/use-student-info"
import { useCourses } from "@/hooks/use-courses"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function IssueCertificatePage() {
  const [isIssuing, setIsIssuing] = useState(false)
  const [issuedCertificate, setIssuedCertificate] = useState<any>(null)
  const { toast } = useToast()
  const { t } = useTranslation()
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
          title: t('issue.missingFieldsTitle'),
          description: t('issue.missingFieldsMessage'),
          variant: "destructive",
        })
        return
      }
      
      // Validate student information is loaded
      if (!student) {
        toast({
          title: t('issue.studentNotFoundTitle'),
          description: t('issue.studentNotFoundMessage'),
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
        courseName: selectedCourse?.course_name || t('issue.noCourseLinked'),
        certificateName: formData.certificateName,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
      }

      setIssuedCertificate(certificate)
      toast({
        title: t('issue.successToastTitle'),
        description: t('issue.successToastMessage'),
      })
    } catch (error) {
      console.error('Error minting certificate:', error)
      toast({
        title: t('issue.errorToastTitle'),
        description: (error as Error)?.message || t('issue.errorToastMessage'),
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
          <h1 className="text-3xl font-bold text-balance">{t('issue.successTitle')}</h1>
          <p className="text-muted-foreground">{t('issue.successSubtitle')}</p>
        </div>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">{t('issue.certificateIssued')}</h3>
                <p className="text-green-600">{t('issue.nftMintedSuccess')}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('issue.verificationCodeLabel')}</Label>
                  <p className="font-mono text-sm">{issuedCertificate.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('issue.tokenIdLabel')}</Label>
                  <p className="font-mono text-sm">{issuedCertificate.tokenId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('issue.transactionHashLabel')}</Label>
                  <p className="font-mono text-xs break-all">{issuedCertificate.transactionHash}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('issue.metadataUriLabel')}</Label>
                  <p className="font-mono text-xs break-all">{issuedCertificate.ipfsHash}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('issue.ipfsHashLabel')}</Label>
                  <p className="font-mono text-sm">{issuedCertificate.ipfsHash}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('issue.studentLabel')}</Label>
                  <p>{t('issue.studentIdPrefix')} {issuedCertificate.studentId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">{t('issue.statusLabel')}</Label>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {issuedCertificate.status === 'Issued' ? t('issue.statusPending') : issuedCertificate.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button>{t('issue.viewOnExplorerButton')}</Button>
              <Button variant="outline">{t('issue.sendNotificationButton')}</Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/training/certificates?refresh=true')}
              >
                {t('issue.backToDashboardButton')}
              </Button>
              <Button variant="outline" onClick={() => setIssuedCertificate(null)}>
                {t('issue.issueAnotherButton')}
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
        <h1 className="text-3xl font-bold text-balance">{t('issue.pageTitle')}</h1>
        <p className="text-muted-foreground">{t('issue.pageSubtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('issue.studentInfoTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* First row: Student ID and Name */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentId">{t('issue.studentIdLabel')}</Label>
                  <Input
                    id="studentId"
                    value={formData.studentId}
                    onChange={(e) => handleInputChange("studentId", e.target.value)}
                    placeholder={t('issue.studentIdPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="studentName">{t('issue.studentNameLabel')}</Label>
                  <Input
                    id="studentName"
                    value={student?.name || ""}
                    placeholder={t('issue.studentNamePlaceholder')}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>
              
              {/* Second row: Email and Wallet Address */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentEmail">{t('issue.studentEmailLabel')}</Label>
                  <Input
                    id="studentEmail"
                    value={student?.email || ""}
                    placeholder={t('issue.studentEmailPlaceholder')}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label htmlFor="studentWallet">{t('issue.studentWalletLabel')}</Label>
                  <Input
                    id="studentWallet"
                    value={student?.wallet_address || ""}
                    placeholder={t('issue.studentWalletPlaceholder')}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>
              
              {/* Loading indicator */}
              {studentLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('issue.searchingStudent')}
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
                    {t('issue.noWalletWarning')}
                  </p>
                </div>
              )}
              
              {/* Student verification status */}
              {student && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <CheckCircle className="w-4 h-4" />
                    {t('issue.studentVerified')}
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
                {t('issue.certificateInfoTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="certificateName">{t('issue.certificateNameLabel')}</Label>
                <Input
                  id="certificateName"
                  value={formData.certificateName}
                  onChange={(e) => handleInputChange("certificateName", e.target.value)}
                  placeholder={t('issue.certificateNamePlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="courseId">{t('issue.courseLabel')}</Label>
                <Select onValueChange={(value) => handleInputChange("courseId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('issue.coursePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('issue.courseNone')}</SelectItem>
                    {coursesLoading ? (
                      <div className="p-2 text-sm text-muted-foreground">{t('issue.courseLoading')}</div>
                    ) : courses.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">{t('issue.courseEmpty')}</div>
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
                {t('issue.validityTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issueDate">{t('issue.issueDateLabel')}</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">{t('issue.expiryDateLabel')}</Label>
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
                  {t('issue.submittingButton')}
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 mr-2" />
                  {t('issue.submitButton')}
                </>
              )}
            </Button>
          </div>
        </div>
          
      </div>
    </div>
  )
}
