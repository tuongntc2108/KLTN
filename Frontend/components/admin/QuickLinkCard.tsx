import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/use-translation'

type ColorVariant = 'blue' | 'purple'

interface QuickLinkCardProps {
  icon: React.ComponentType<{ className?: string }>
  titleKey: string
  descKey: string
  href: string
  color: ColorVariant
}

const colorClasses: Record<ColorVariant, string> = {
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600'
}

export const QuickLinkCard: React.FC<QuickLinkCardProps> = ({
  icon: Icon,
  titleKey,
  descKey,
  href,
  color
}) => {
  const { t } = useTranslation()

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        <div
          className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{t(titleKey as any)}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t(descKey as any)}
          </p>
        </div>
      </div>
      <Button asChild className="mt-4 w-full">
        <Link href={href}>
          {t('adminOverview.openButtonText')}
        </Link>
      </Button>
    </Card>
  )
}
