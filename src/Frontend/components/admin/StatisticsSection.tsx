import React from 'react'
import { Users, Award, BookOpen, Building2 } from 'lucide-react'
import { StatCard } from './StatCard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/use-translation'
import { DashboardStats } from '@/hooks/use-admin-stats'

interface StatisticsProps {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  onRetry: () => void
}

export const StatisticsSection: React.FC<StatisticsProps> = ({
  stats,
  loading,
  error,
  onRetry
}) => {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mt-3"></div>
              </div>
              <div className="h-12 w-12 bg-gray-200 rounded-lg flex-shrink-0 ml-4"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-32 mt-4"></div>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-600 font-medium">{t('adminOverview.error')}</p>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Button variant="outline" onClick={onRetry} size="sm">
            {t('common.retry')}
          </Button>
        </div>
      </Card>
    )
  }

  const statCards = [
    {
      key: 'students',
      icon: Users,
      label: t('adminOverview.statStudents'),
      value: stats.totalStudents,
      growth: stats.studentsGrowth
    },
    {
      key: 'certificates',
      icon: Award,
      label: t('adminOverview.statCertificates'),
      value: stats.totalCertificates,
      growth: stats.certificatesGrowth
    },
    {
      key: 'courses',
      icon: BookOpen,
      label: t('adminOverview.statCourses'),
      value: stats.totalCourses,
      growth: stats.coursesGrowth
    },
    {
      key: 'issuers',
      icon: Building2,
      label: t('adminOverview.statIssuers'),
      value: stats.totalIssuers,
      growth: stats.issuersGrowth
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {statCards.map((card) => (
        <StatCard
          key={card.key}
          icon={card.icon}
          label={card.label}
          value={card.value}
          growth={card.growth}
        />
      ))}
    </div>
  )
}
