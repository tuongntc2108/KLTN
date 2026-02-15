"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Bot, LayoutGrid } from "lucide-react"

const quickLinks = [
  {
    title: "Tổng quan",
    description: "Theo dõi hoạt động quản trị và thông tin tổng hợp.",
    href: "/dashboard/admin",
    icon: LayoutGrid
  },
  {
    title: "Quản lý đơn vị đào tạo",
    description: "Thêm và quản lý các issuer mới trên hệ thống.",
    href: "/dashboard/admin/issuers",
    icon: Building2
  },
  {
    title: "Quản lý chatbot",
    description: "Upload tài liệu và huấn luyện chatbot AI.",
    href: "/dashboard/admin/chatbot",
    icon: Bot
  }
]

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tổng quan quản trị</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý đơn vị đào tạo, chatbot và theo dõi hệ thống.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((item) => (
          <Card key={item.title} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild className="w-full">
                <Link href={item.href}>Mở trang</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
