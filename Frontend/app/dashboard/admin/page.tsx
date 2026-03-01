"use client"

import { useTranslation } from "@/hooks/use-translation"
import { useAdminStats } from "@/hooks/use-admin-stats"
import { StatisticsSection } from "@/components/admin/StatisticsSection"
import { QuickLinksSection } from "@/components/admin/QuickLinksSection"

export default function AdminOverviewPage() {
  const { t } = useTranslation()
  const { stats, loading, error, retry } = useAdminStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('adminOverview.pageTitle')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('adminOverview.pageSubtitle')}
        </p>
      </div>

      {/* Row 1: Statistics */}
      <StatisticsSection
        stats={stats}
        loading={loading}
        error={error}
        onRetry={retry}
      />

      {/* Row 2: Quick Links */}
      <QuickLinksSection />
    </div>
  )
}
