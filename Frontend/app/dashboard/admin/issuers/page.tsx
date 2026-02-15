"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"

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
        title: "Không thể tải danh sách",
        description: "Vui lòng thử lại sau.",
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
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ tên, email và ví blockchain.",
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
        title: "Thêm issuer thành công",
        description: "Quyền issuer đã được cấp trên blockchain."
      })
      setFormState(initialFormState)
      await fetchIssuers()
    } catch (error) {
      console.error("Add issuer error:", error)
      toast({
        title: "Không thể thêm issuer",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
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
          <CardTitle>Thêm đơn vị đào tạo</CardTitle>
          <CardDescription>Nhập thông tin đơn vị đào tạo mới và cấp quyền issuer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issuer-name">Tên đơn vị</Label>
              <Input
                id="issuer-name"
                value={formState.name}
                onChange={(event) => handleInputChange("name", event.target.value)}
                placeholder="VD: UET"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer-email">Email</Label>
              <Input
                id="issuer-email"
                value={formState.email}
                onChange={(event) => handleInputChange("email", event.target.value)}
                placeholder="issuer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer-wallet">Ví blockchain</Label>
              <Input
                id="issuer-wallet"
                value={formState.wallet_address}
                onChange={(event) => handleInputChange("wallet_address", event.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer-organization">Tổ chức</Label>
              <Input
                id="issuer-organization"
                value={formState.organization}
                onChange={(event) => handleInputChange("organization", event.target.value)}
                placeholder="VD: VNU"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="issuer-website">Website</Label>
              <Input
                id="issuer-website"
                value={formState.website}
                onChange={(event) => handleInputChange("website", event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Đang xử lý..." : "Thêm issuer"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn vị đào tạo</CardTitle>
          <CardDescription>{loading ? "Đang tải dữ liệu..." : "Quản lý các issuer đã được cấp quyền."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Tổ chức</TableHead>
                <TableHead>Website</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issuers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Chưa có issuer nào.
                  </TableCell>
                </TableRow>
              ) : (
                issuers.map((issuer) => (
                  <TableRow key={issuer.id}>
                    <TableCell>{issuer.name}</TableCell>
                    <TableCell>{issuer.email}</TableCell>
                    <TableCell>{issuer.wallet_address}</TableCell>
                    <TableCell>{issuer.organization || "-"}</TableCell>
                    <TableCell>{issuer.website || "-"}</TableCell>
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
