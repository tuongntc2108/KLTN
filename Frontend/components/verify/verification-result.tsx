"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AISummaryButton } from "@/components/ai/ai-summary-button"
import {
    CheckCircle,
    FileText,
    Calendar,
    Building,
    User,
    Award,
    ExternalLink,
    Download,
    Sparkles,
    Shield,
} from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

interface VerificationResultProps {
    verificationResult: {
        isValid: boolean
        message?: string
        statusMessage?: string
        certificate?: {
            id: string
            name: string
            holder: string
            issuer: string
            issueDate: string
            expiryDate: string
            status: string
            tokenId: string
            blockchainNetwork: string
            verificationCode: string
            revocation_reason?: string | null
            events: any[]
            course: {
                name: string
                description: string
            }
        }
    }
}

export function VerificationResult({ verificationResult }: VerificationResultProps) {
    if (!verificationResult) return null
    const { t, language } = useTranslation()

    const getEventTypeLabel = (type: string) => {
        switch (type) {
            case "Issued":
                return t('verify.eventIssued')
            case "Claimed":
                return t('verify.eventClaimed')
            case "Revoked":
                return t('verify.eventRevoked')
            case "Expired":
                return t('verify.eventExpired')
            case "Replaced":
                return t('verify.eventReplaced')
            default:
                return t('verify.eventUnknown')
        }
    }

    return (
        <div className="space-y-6 text-left">
            {/* Status Card */}
            {verificationResult.isValid ? (
                <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-green-800">{t('verify.validTitle')}</h3>
                                <p className="text-green-900">{verificationResult.statusMessage || t('verify.validDefaultMessage')}</p>
                            </div>
                            <Badge className="ml-auto bg-green-100 text-green-800 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {t('status.active')}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full flex-shrink-0">
                                <CheckCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-red-800">{t('verify.invalidTitle')}</h3>
                                <p className="text-red-900 font-semibold mt-1">
                                    {verificationResult.certificate?.status === 'Expired' && t('verify.expiredStatus')}
                                    {verificationResult.certificate?.status === 'Revoked' && t('verify.revokedStatus')}
                                    {verificationResult.certificate?.status === 'Replaced' && t('verify.replacedStatus')}
                                    {!verificationResult.certificate?.status && t('verify.cannotVerifyStatus')}
                                </p>
                                <p className="text-red-800 text-sm mt-2">
                                    {verificationResult.certificate?.status === 'Expired' && `${t('verify.expiredDetailPrefix')}${verificationResult.certificate?.expiryDate}${t('verify.expiredDetailSuffix')}`}
                                    {verificationResult.certificate?.status === 'Revoked' && `${t('verify.revokedDetailPrefix')}${verificationResult.certificate?.revocation_reason || t('verify.revokedDetailNoReason')}`}
                                    {verificationResult.certificate?.status === 'Replaced' && t('verify.replacedDetail')}
                                    {!verificationResult.certificate?.status && verificationResult.message}
                                </p>
                            </div>
                            <Badge className="bg-red-100 text-red-800 border-red-200 flex-shrink-0">
                                {t('status.invalid')}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Certificate Details */}
            {verificationResult.certificate && (
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <Award className="w-5 h-5" />
                                <div>
                                    <CardTitle>{t('verify.certificateInfo')}</CardTitle>
                                    {!verificationResult.isValid && (
                                        <p className="text-sm text-red-700 font-semibold mt-1">
                                            ⚠️ {verificationResult.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('verify.certificateName')}</p>
                                    <p className="text-lg font-semibold">{verificationResult.certificate.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('verify.recipient')}</p>
                                    <p className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        {verificationResult.certificate.holder}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('verify.issuer')}</p>
                                    <p className="flex items-center gap-2">
                                        <Building className="w-4 h-4" />
                                        {verificationResult.certificate.issuer}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('verify.verificationCode')}</p>
                                    <p className="font-mono text-sm">{verificationResult.certificate.verificationCode || verificationResult.certificate.id}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('verify.issueDate')}</p>
                                    <p className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {verificationResult.certificate.issueDate}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('verify.expiryDate')}</p>
                                    <p className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {verificationResult.certificate.expiryDate}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('verify.tokenId')}</p>
                                    <p className="font-mono text-sm break-all">{verificationResult.certificate.tokenId}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('verify.blockchainNetwork')}</p>
                                    <p>{verificationResult.certificate.blockchainNetwork}</p>
                                </div>
                            </div>
                        </div>

                        {/* Blockchain Info */}
                        <div className="border-t pt-4">
                            <h4 className="font-semibold mb-3">{t('verify.blockchainInfo')}</h4>
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="font-medium text-muted-foreground">{t('verify.tokenId')}</p>
                                    <p className="font-mono break-all">{verificationResult.certificate.tokenId}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-muted-foreground">{t('verify.blockchainNetwork')}</p>
                                    <p>{verificationResult.certificate.blockchainNetwork}</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="mt-3 bg-transparent">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                {t('common.viewOnExplorer')}
                            </Button>
                        </div>

                        {/* Revocation Reason Section - Only for revoked certificates */}
                        {!verificationResult.isValid && verificationResult.certificate?.status === 'Revoked' && verificationResult.certificate?.revocation_reason && (
                            <div className="border-t pt-4 mt-4">
                                <h4 className="font-semibold mb-3 text-red-800">{t('verify.revokeReasonTitle')}</h4>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-900 font-medium">{verificationResult.certificate.revocation_reason}</p>
                                </div>
                            </div>
                        )}

                    </CardContent>
                </Card>
            )}

            {/* Course Information */}
            {verificationResult.isValid && verificationResult.certificate?.course && (
                <AISummaryButton
                    certificateId={verificationResult.certificate.tokenId}
                    certificateName={verificationResult.certificate.name}
                />
            )}

            {/* Certificate History */}
            {verificationResult.certificate?.events && verificationResult.certificate.events.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            <CardTitle>{t('verify.historyTitle')}</CardTitle>
                        </div>
                        <CardDescription>{t('verify.historyDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {verificationResult.certificate.events.map((ev: any) => {
                                const dateStr = ev.created_at
                                  ? new Date(ev.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')
                                  : t('common.notAvailable')
                                const type = ev.type || 'Unknown'
                                const reason = ev.reason
                                const related = ev.related_token
                                const block = ev.block_number
                                const tx = ev.tx_hash
                                return (
                                    <div key={`${ev.id}-${tx}`} className="flex items-start gap-3">
                                        <div className="mt-1">
                                            {type === 'Issued' && <Award className="w-5 h-5 text-blue-600" />}
                                            {type === 'Claimed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                                            {type === 'Revoked' && <Shield className="w-5 h-5 text-red-600" />}
                                            {type === 'Expired' && <Calendar className="w-5 h-5 text-orange-600" />}
                                            {type === 'Replaced' && <Sparkles className="w-5 h-5 text-purple-600" />}
                                            {!(['Issued', 'Claimed', 'Revoked', 'Expired', 'Replaced'].includes(type)) && <Shield className="w-5 h-5 text-muted-foreground" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{getEventTypeLabel(type)}</Badge>
                                                <span className="text-sm text-muted-foreground">{dateStr}</span>
                                            </div>
                                            {reason && (
                                                <p className="text-sm mt-1">{t('verify.reasonLabel')}: <span className="font-medium">{reason}</span></p>
                                            )}
                                            {related && (
                                                <p className="text-sm mt-1">{t('verify.replacedByToken')}: <span className="font-mono">{related}</span></p>
                                            )}
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {block && <span>Block: {block}</span>}
                                                {tx && <span className="ml-2">Tx: {tx}</span>}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

          
        </div>
    )
}
