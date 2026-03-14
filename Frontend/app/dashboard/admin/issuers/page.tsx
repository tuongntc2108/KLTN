"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"
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
  certificate_count: number
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
  const [searchTerm, setSearchTerm] = useState("")
  const [editingIssuer, setEditingIssuer] = useState<Issuer | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editFormState, setEditFormState] = useState({
    name: "",
    organization: "",
    website: ""
  })
  const [issuerToDelete, setIssuerToDelete] = useState<Issuer | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [processingIssuerId, setProcessingIssuerId] = useState<number | null>(null)
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

  const filteredIssuers = issuers.filter((issuer) => {
    const keyword = searchTerm.toLowerCase()
    if (!keyword) return true

    return (
      issuer.name.toLowerCase().includes(keyword) ||
      issuer.email.toLowerCase().includes(keyword) ||
      (issuer.organization || "").toLowerCase().includes(keyword) ||
      (issuer.website || "").toLowerCase().includes(keyword)
    )
  })

  const startEditIssuer = (issuer: Issuer) => {
    if (issuer.certificate_count > 0) {
      toast({
        title: t('adminIssuers.editBlockedTitle'),
        description: t('adminIssuers.editBlockedDesc'),
        variant: "destructive"
      })
      return
    }

    setEditingIssuer(issuer)
    setEditFormState({
      name: issuer.name,
      organization: issuer.organization || "",
      website: issuer.website || ""
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateIssuer = async () => {
    if (!editingIssuer || !editFormState.name.trim()) {
      toast({
        title: t('adminIssuers.updateErrorTitle'),
        description: t('adminIssuers.updateErrorMissingDesc'),
        variant: "destructive"
      })
      return
    }

    setProcessingIssuerId(editingIssuer.id)
    try {
      const response = await fetch(`${apiBaseUrl}/api/issuers/${editingIssuer.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: editFormState.name.trim(),
          organization: editFormState.organization.trim(),
          website: editFormState.website.trim()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || t('adminIssuers.updateErrorDesc'))
      }

      toast({
        title: t('adminIssuers.updateSuccessTitle'),
        description: t('adminIssuers.updateSuccessDesc')
      })

      setIsEditDialogOpen(false)
      setEditingIssuer(null)
      setEditFormState({ name: "", organization: "", website: "" })
      await fetchIssuers()
    } catch (error) {
      console.error("Update issuer error:", error)
      toast({
        title: t('adminIssuers.updateErrorTitle'),
        description: error instanceof Error ? error.message : t('adminIssuers.updateErrorDesc'),
        variant: "destructive"
      })
    } finally {
      setProcessingIssuerId(null)
    }
  }

  const openDeleteDialog = (issuer: Issuer) => {
    if (issuer.certificate_count > 0) {
      toast({
        title: t('adminIssuers.deleteBlockedTitle'),
        description: t('adminIssuers.deleteBlockedDesc'),
        variant: "destructive"
      })
      return
    }

    setIssuerToDelete(issuer)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteIssuer = async () => {
    if (!issuerToDelete) {
      return
    }

    setProcessingIssuerId(issuerToDelete.id)
    try {
      const response = await fetch(`${apiBaseUrl}/api/issuers/${issuerToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || t('adminIssuers.deleteErrorDesc'))
      }

      toast({
        title: t('adminIssuers.deleteSuccessTitle'),
        description: t('adminIssuers.deleteSuccessDesc')
      })

      if (editingIssuer?.id === issuerToDelete.id) {
        setIsEditDialogOpen(false)
        setEditingIssuer(null)
        setEditFormState({ name: "", organization: "", website: "" })
      }

      setIsDeleteDialogOpen(false)
      setIssuerToDelete(null)

      await fetchIssuers()
    } catch (error) {
      console.error("Delete issuer error:", error)
      toast({
        title: t('adminIssuers.deleteErrorTitle'),
        description: error instanceof Error ? error.message : t('adminIssuers.deleteErrorDesc'),
        variant: "destructive"
      })
    } finally {
      setProcessingIssuerId(null)
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
          <div className="mb-4">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('adminIssuers.searchPlaceholder')}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('adminIssuers.tableHeaderName')}</TableHead>
                <TableHead>{t('adminIssuers.tableHeaderEmail')}</TableHead>
                <TableHead>{t('adminIssuers.tableHeaderWallet')}</TableHead>
                <TableHead>{t('adminIssuers.tableHeaderOrganization')}</TableHead>
                <TableHead>{t('adminIssuers.tableHeaderWebsite')}</TableHead>
                <TableHead>{t('adminIssuers.tableHeaderCertificates')}</TableHead>
                <TableHead>{t('adminIssuers.tableHeaderActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIssuers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t('adminIssuers.listEmpty')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredIssuers.map((issuer) => (
                  <TableRow key={issuer.id}>
                    <TableCell>{issuer.name}</TableCell>
                    <TableCell>{issuer.email}</TableCell>
                    <TableCell>{issuer.wallet_address}</TableCell>
                    <TableCell>{issuer.organization || t('adminIssuers.emptyDash')}</TableCell>
                    <TableCell>{issuer.website || t('adminIssuers.emptyDash')}</TableCell>
                    <TableCell>{issuer.certificate_count || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditIssuer(issuer)}
                          disabled={issuer.certificate_count > 0 || processingIssuerId === issuer.id}
                          title={issuer.certificate_count > 0 ? t('adminIssuers.actionBlockedHint') : undefined}
                        >
                          {t('adminIssuers.editButton')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteDialog(issuer)}
                          disabled={issuer.certificate_count > 0 || processingIssuerId === issuer.id}
                          title={issuer.certificate_count > 0 ? t('adminIssuers.actionBlockedHint') : undefined}
                        >
                          {t('adminIssuers.deleteButton')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setEditingIssuer(null)
            setEditFormState({ name: "", organization: "", website: "" })
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('adminIssuers.editFormTitle')}</DialogTitle>
            <DialogDescription>
              {t('adminIssuers.editFormDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-issuer-email" className="text-right">
                {t('adminIssuers.emailLabel')}
              </Label>
              <Input
                id="edit-issuer-email"
                className="col-span-3 opacity-70 cursor-not-allowed"
                value={editingIssuer?.email || ""}
                readOnly
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-issuer-wallet" className="text-right">
                {t('adminIssuers.walletLabel')}
              </Label>
              <Input
                id="edit-issuer-wallet"
                className="col-span-3 opacity-70 cursor-not-allowed"
                value={editingIssuer?.wallet_address || ""}
                readOnly
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-issuer-name" className="text-right">
                {t('adminIssuers.nameLabel')}
              </Label>
              <Input
                id="edit-issuer-name"
                className="col-span-3"
                value={editFormState.name}
                onChange={(event) =>
                  setEditFormState((prev) => ({
                    ...prev,
                    name: event.target.value
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-issuer-organization" className="text-right">
                {t('adminIssuers.organizationLabel')}
              </Label>
              <Input
                id="edit-issuer-organization"
                className="col-span-3"
                value={editFormState.organization}
                onChange={(event) =>
                  setEditFormState((prev) => ({
                    ...prev,
                    organization: event.target.value
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-issuer-website" className="text-right">
                {t('adminIssuers.websiteLabel')}
              </Label>
              <Input
                id="edit-issuer-website"
                className="col-span-3"
                value={editFormState.website}
                onChange={(event) =>
                  setEditFormState((prev) => ({
                    ...prev,
                    website: event.target.value
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingIssuer(null)
                setEditFormState({ name: "", organization: "", website: "" })
              }}
            >
              {t('adminIssuers.cancelButton')}
            </Button>
            <Button
              onClick={handleUpdateIssuer}
              disabled={processingIssuerId === editingIssuer?.id}
            >
              {t('adminIssuers.updateButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminIssuers.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('adminIssuers.deleteConfirmPrefix')} <strong>{issuerToDelete?.name}</strong>? {t('adminIssuers.deleteConfirmSuffix')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setIssuerToDelete(null)
              }}
            >
              {t('adminIssuers.cancelButton')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIssuer}
              disabled={processingIssuerId === issuerToDelete?.id}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingIssuerId === issuerToDelete?.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('adminIssuers.deletingButton')}
                </>
              ) : (
                t('adminIssuers.deleteButton')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
