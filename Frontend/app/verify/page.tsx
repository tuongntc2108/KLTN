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
import { useTranslation } from "@/hooks/use-translation"

export default function VerifyPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { t, language } = useTranslation()

  // Real verification function
  const handleVerify = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)

    try {
      // Determine if input is verification code or token ID
      // Token ID: pure number or starts with 0x
      // Verification code: starts with hash_ or other patterns
      const isTokenId = /^\d+$/.test(searchQuery) || searchQuery.startsWith('0x')
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
          message: data.message || t('verify.verificationFailed')
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
          message: data.message || t('verify.invalidCertificate')
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
        if (!dateString) return t('common.notAvailable')
        const date = new Date(dateString)
        return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')
      }

      // Extract information from the new API response structure
      const courseName = certificate.certificate_detail?.course_name || t('common.notAvailable')
      const issuerName = certificate.issuer?.name || t('common.notAvailable')
      const certificateName = certificate.certificate_detail?.certificate_name || t('common.notAvailable')
      const recipientName = certificate.recipient?.full_name || t('common.notAvailable')

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
            description: metadata?.description || t('verify.courseDescUnavailable'),
          },
        },
        statusMessage: data.message
      })
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationResult({
        isValid: false,
        message: t('verify.verifyError')
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
        <h1 className="text-4xl font-bold text-balance">{t('verify.title')}</h1>
        <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">{t('verify.subtitle')}</p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            {t('verify.searchTitle')}
          </CardTitle>
          <CardDescription>{t('verify.searchDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="search" className="w-full">
            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder={t('verify.inputPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleVerify} disabled={isLoading}>
                  {isLoading ? t('verify.verifying') : t('verify.verify')}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{t('verify.exampleHint')}</p>
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
            <h3 className="font-semibold mb-2">{t('verify.securityTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('verify.securityDesc')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Sparkles className="w-8 h-8 text-secondary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">{t('verify.aiTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('verify.aiDesc')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 text-secondary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">{t('verify.instantTitle')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('verify.instantDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
