"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, CheckCircle, Copy, ExternalLink, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWallet } from "@/hooks/use-wallet"
import { useTranslation } from "@/hooks/use-translation"

export function WalletConnect() {
  const { t } = useTranslation()
  const {
    walletInfo,
    isConnecting,
    error,
    isMetaMaskInstalled,
    connectWallet,
    copyAddress,
    openInExplorer,
    formatAddress,
    clearWalletFromBackend,
    refreshWalletState
  } = useWallet()

  // MetaMask not installed warning
  if (!isMetaMaskInstalled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {t('wallet.title')}
          </CardTitle>
          <CardDescription>{t('wallet.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('wallet.metaMaskNotFoundError')}
            </AlertDescription>
          </Alert>
          <div className="text-center py-6">
            <Button 
              onClick={() => window.open('https://metamask.io/download/', '_blank')}
              className="mb-4"
            >
              {t('wallet.downloadButtonLabel')}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('wallet.reloadPageDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {t('wallet.title')}
          </CardTitle>
          <CardDescription>{t('wallet.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="text-center py-4">
            <Button onClick={connectWallet} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('wallet.connectingLabel')}
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  {t('wallet.retryButtonLabel')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Not connected state
  if (!walletInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {t('wallet.title')}
          </CardTitle>
          <CardDescription>{t('wallet.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('wallet.notConnectedTitle')}</h3>
            <p className="text-muted-foreground mb-4">{t('wallet.notConnectedDesc')}</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-left">
              <h4 className="font-semibold text-blue-800 mb-2">{t('wallet.importantNote')}</h4>
              <ul className="text-blue-700 space-y-1 text-xs">
                <li>• {t('wallet.notePoint1')}</li>
                <li>• {t('wallet.notePoint2')}</li>
                <li>• {t('wallet.notePoint3')}</li>
                <li>• {t('wallet.notePoint4')}</li>
              </ul>
            </div>
            
            <Button onClick={connectWallet} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('wallet.connectingLabel')}
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  {t('wallet.connectButtonLabel')}
                </>
              )}
            </Button>
            
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshWalletState}
                className="text-xs"
              >
                {t('wallet.refreshStateLabel')}
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">{t('wallet.supportedWalletsLabel')}</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 border rounded">
                <div className="w-6 h-6 bg-orange-500 rounded"></div>
                <span className="text-sm">MetaMask</span>
              </div>
              <div className="flex items-center gap-2 p-2 border rounded">
                <div className="w-6 h-6 bg-blue-500 rounded"></div>
                <span className="text-sm">WalletConnect</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Connected state
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {t('wallet.title')}
          </CardTitle>
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('wallet.connectedStatus')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">{t('wallet.walletAddressLabel')}</p>
              <p className="text-xs text-muted-foreground font-mono">{formatAddress(walletInfo.address)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={copyAddress}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={openInExplorer}>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">{t('wallet.networkLabel')}</p>
              <p className="text-xs text-muted-foreground">{walletInfo.network}</p>
            </div>
            <Badge variant="default">
              <CheckCircle className="w-3 h-3 mr-1" />
              {t('wallet.activeStatus')}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">{t('wallet.balanceLabel')}</p>
              <p className="text-xs text-muted-foreground">{walletInfo.balance}</p>
            </div>
            <Button variant="outline" size="sm">
              {t('wallet.depositLabel')}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={connectWallet}>
            {t('wallet.changeAccountLabel')}
          </Button>

          <Button variant="outline" className="flex-1 bg-transparent" onClick={async () => {
            await clearWalletFromBackend()
          }}>
            {t('wallet.disconnectLabel')}
          </Button>
          <Button className="flex-1" onClick={openInExplorer}>{t('wallet.viewExplorerLabel')}</Button>
        </div>
      </CardContent>
    </Card>
  )
}