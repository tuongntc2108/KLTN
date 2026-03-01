"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"

interface Issuer {
  id: number
  name: string
  email: string
  wallet_address: string
  organization?: string
  website?: string
  created_at?: string
}

const initialFormState = {
  name: "",
  email: "",
  wallet_address: "",
  organization: "",
  website: ""
}

export default function IssuerManagementPage() {
  const { t } = useTranslation()
  const [formState, setFormState] = useState(initialFormState)
  const [issuers, setIssuers] = useState<Issuer[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

  const fetchIssuers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/issuers`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error("Failed to fetch issuers")
      }

      const data = await response.json()
      setIssuers(data.issuers || [])
    } catch (error) {
      console.error("Fetch issuers error:", error)
      toast({
        title: t('adminIssuers.loadingError'),
        description: t('adminIssuers.loadingErrorDesc'),
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIssuers()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    if (!formState.name || !formState.email || !formState.wallet_address) {
      toast({
        title: t('adminIssuers.submitErrorMissing'),
        description: t('adminIssuers.submitErrorMissingDesc'),
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/issuers`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formState.name,
          email: formState.email,
          wallet_address: formState.wallet_address,
          organization: formState.organization,
          website: formState.website
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to add issuer")
      }

      toast({
        title: t('adminIssuers.submitSuccess'),
        description: t('adminIssuers.submitSuccessDesc')
      })
      setFormState(initialFormState)
      await fetchIssuers()
    } catch (error) {
      console.error("Add issuer error:", error)
      toast({
        title: t('adminIssuers.submitError'),
        description: error instanceof Error ? error.message : t('adminIssuers.submitErrorDesc'),
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('adminIssuers.formTitle')}</CardTitle>
          <CardDescription>{t('adminIssuers.formDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issuer-name">{t('adminIssuers.nameLabel')}</Label>
              <Input
                id="issuer-name"
                value={formState.name}
                onChange={(event) => handleInputChange("name", event.target.value)}
                placeholder={t('adminIssuers.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer-email">{t('adminIssuers.emailLabel')}</Label>
              <Input
                id="issuer-email"
                value={formState.email}
                onChange={(event) => handleInputChange("email", event.target.value)}
                placeholder={t('adminIssuers.emailPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer-wallet">{t('adminIssuers.walletLabel')}</Label>
              <Input
                id="issuer-wallet"
                value={formState.wallet_address}
                onChange={(event) => handleInputChange("wallet_address", event.target.value)}
                placeholder={t('adminIssuers.walletPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer-organization">{t('adminIssuers.organizationLabel')}</Label>
              <Input
                id="issuer-organization"
                value={formState.organization}
                onChange={(event) => handleInputChange("organization", event.target.value)}
                placeholder={t('adminIssuers.organizationPlaceholder')}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="issuer-website">{t('adminIssuers.websiteLabel')}</Label>
              <Input
                id="issuer-website"
                value={formState.website}
                onChange={(event) => handleInputChange("website", event.target.value)}
                placeholder={t('adminIssuers.websitePlaceholder')}
              />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('adminIssuers.submittingButton') : t('adminIssuers.submitButton')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('adminIssuers.listTitle')}</CardTitle>
          <CardDescription>{loading ? t('adminIssuers.listDescription') : t('adminIssuers.listDescriptionReady')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('adminIssuers.tableHeaderName')}</TableHead>
                <TableHead>{t('adminIssuers.tableHeaderEmail')}</TableHead>
                <TableHead>{t('adminIssuers.tableHeaderWallet')}</TableHead>
                <TableHead>{t('adminIssuers.tableHeaderOrganization')}</TableHead>
                <TableHead>{t('adminIssuers.tableHeaderWebsite')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issuers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t('adminIssuers.listEmpty')}
                  </TableCell>
                </TableRow>
              ) : (
                issuers.map((issuer) => (
                  <TableRow key={issuer.id}>
                    <TableCell>{issuer.name}</TableCell>
                    <TableCell>{issuer.email}</TableCell>
                    <TableCell>{issuer.wallet_address}</TableCell>
                    <TableCell>{issuer.organization || t('adminIssuers.emptyDash')}</TableCell>
                    <TableCell>{issuer.website || t('adminIssuers.emptyDash')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
