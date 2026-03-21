"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { VerificationResult } from "@/components/verify/verification-result"
import { useTranslation } from "@/hooks/use-translation"

export function VerifySection() {
    const [searchQuery, setSearchQuery] = useState("")
    const [verificationResult, setVerificationResult] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const { t, language } = useTranslation()

    const handleVerify = async () => {
        if (!searchQuery.trim()) return

        setIsLoading(true)
        setVerificationResult(null)

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
        <section id="verify" className="py-16 px-4">
            <div className="container mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold mb-4">{t('verify.landingTitle')}</h2>
                <p className="text-muted-foreground mb-8">{t('verify.landingSubtitle')}</p>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder={t('verify.inputPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleVerify()
                                }}
                                className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-input"
                            />
                            <Button size="lg" onClick={handleVerify} disabled={isLoading}>
                                {isLoading ? t('verify.verifying') : t('verify.verify')}
                            </Button>
                        </div>

                        {verificationResult && (
                            <div className="mt-8">
                                <VerificationResult verificationResult={verificationResult} />
                            </div>
                        )}

                    </CardContent>
                </Card>
            </div>
        </section>
    )
}
