import React from 'react'
import { Building2, Bot } from 'lucide-react'
import { QuickLinkCard } from './QuickLinkCard'

export const QuickLinksSection: React.FC = () => {
  const quickLinks = [
    {
      key: 'issuers',
      icon: Building2,
      titleKey: 'adminOverview.issuersTitle',
      descKey: 'adminOverview.issuersDesc',
      href: '/dashboard/admin/issuers',
      color: 'blue' as const
    },
    {
      key: 'chatbot',
      icon: Bot,
      titleKey: 'adminOverview.chatbotTitle',
      descKey: 'adminOverview.chatbotDesc',
      href: '/dashboard/admin/chatbot',
      color: 'purple' as const
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 mt-6">
      {quickLinks.map((link) => (
        <QuickLinkCard
          key={link.key}
          icon={link.icon}
          titleKey={link.titleKey}
          descKey={link.descKey}
          href={link.href}
          color={link.color}
        />
      ))}
    </div>
  )
}
