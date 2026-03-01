"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Bot, LayoutGrid } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

const quickLinkKeys = [
  {
    titleKey: "adminOverview.overviewTitle",
    descKey: "adminOverview.overviewDesc",
    href: "/dashboard/admin",
    icon: LayoutGrid
  },
  {
    titleKey: "adminOverview.issuersTitle",
    descKey: "adminOverview.issuersDesc",
    href: "/dashboard/admin/issuers",
    icon: Building2
  },
  {
    titleKey: "adminOverview.chatbotTitle",
    descKey: "adminOverview.chatbotDesc",
    href: "/dashboard/admin/chatbot",
    icon: Bot
  }
]

export default function AdminOverviewPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('adminOverview.pageTitle')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('adminOverview.pageSubtitle')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickLinkKeys.map((item) => (
          <Card key={item.titleKey} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{t(item.titleKey as any)}</CardTitle>
                  <CardDescription>{t(item.descKey as any)}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild className="w-full">
                <Link href={item.href}>{t('adminOverview.openButtonText')}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
