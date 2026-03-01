"use client"

import { WalletConnect } from "@/components/blockchain/wallet-connect"
import { useTranslation } from "@/hooks/use-translation"

export default function StudentWalletPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-balance">{t('wallet.title')}</h1>
        <p className="text-muted-foreground">{t('wallet.description')}</p>
      </div>

      {/* Wallet Connection */}
      <WalletConnect />
    </div>
  )
}
