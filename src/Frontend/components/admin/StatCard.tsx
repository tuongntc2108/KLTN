import React from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, Minus, TrendingDown } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  growth: number | null
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, growth }) => {
  const { t } = useTranslation()

  const isPositive = growth !== null && growth > 0
  const isZero = growth !== null && growth === 0
  const isNegative = growth !== null && growth < 0

  const growthColor = isPositive
    ? 'text-green-600'
    : isZero
      ? 'text-gray-600'
      : 'text-orange-600'

  const GrowthIcon =
    isPositive ? TrendingUp : isZero ? Minus : TrendingDown

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <h3 className="text-3xl font-bold mt-2">
            {value.toLocaleString()}
          </h3>
        </div>
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ml-4">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>

      {/* Growth Badge */}
      {growth !== null && (
        <div className={`mt-4 flex items-center gap-2 text-sm font-medium ${growthColor}`}>
          <GrowthIcon className="h-4 w-4" />
          <span>
            {isPositive ? '+' : ''}
            {growth}% {t('adminOverview.vsLastMonth')}
          </span>
        </div>
      )}
    </Card>
  )
}
