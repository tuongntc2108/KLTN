"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, CheckCircle, Copy, ExternalLink, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWallet } from "@/hooks/use-wallet"

export function WalletConnect() {
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
            Kết nối ví Blockchain
          </CardTitle>
          <CardDescription>Kết nối ví để nhận và quản lý chứng chỉ NFT của bạn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              MetaMask không được cài đặt. Vui lòng cài đặt MetaMask để tiếp tục.
            </AlertDescription>
          </Alert>
          <div className="text-center py-6">
            <Button 
              onClick={() => window.open('https://metamask.io/download/', '_blank')}
              className="mb-4"
            >
              Tải xuống MetaMask
            </Button>
            <p className="text-sm text-muted-foreground">
              Sau khi cài đặt, hãy tải lại trang này.
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
            Kết nối ví Blockchain
          </CardTitle>
          <CardDescription>Kết nối ví để nhận và quản lý chứng chỉ NFT của bạn</CardDescription>
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
                  Đang kết nối...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Thử lại
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
            Kết nối ví Blockchain
          </CardTitle>
          <CardDescription>Kết nối ví để nhận và quản lý chứng chỉ NFT của bạn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Chưa kết nối ví</h3>
            <p className="text-muted-foreground mb-4">Bạn cần kết nối ví blockchain để nhận chứng chỉ NFT</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-left">
              <h4 className="font-semibold text-blue-800 mb-2">💡 Lưu ý quan trọng:</h4>
              <ul className="text-blue-700 space-y-1 text-xs">
                <li>• Khi click "Kết nối ví", MetaMask sẽ hiện popup</li>
                <li>• Hãy chọn account mà bạn muốn sử dụng</li>
                <li>• Đảm bảo chọn đúng account để nhận chứng chỉ</li>
                <li>• Nếu cần đổi account, click "Đổi tài khoản" sau khi kết nối</li>
              </ul>
            </div>
            
            <Button onClick={connectWallet} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang kết nối...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Kết nối ví MetaMask
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
                🔄 Tải lại trạng thái
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Ví được hỗ trợ:</h4>
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
            Ví Blockchain
          </CardTitle>
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Đã kết nối
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Địa chỉ ví</p>
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
              <p className="text-sm font-medium">Mạng</p>
              <p className="text-xs text-muted-foreground">{walletInfo.network}</p>
            </div>
            <Badge variant="default">
              <CheckCircle className="w-3 h-3 mr-1" />
              Hoạt động
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Số dư</p>
              <p className="text-xs text-muted-foreground">{walletInfo.balance}</p>
            </div>
            <Button variant="outline" size="sm">
              Nạp tiền
            </Button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={connectWallet}>
            Đổi tài khoản
          </Button>

          <Button variant="outline" className="flex-1 bg-transparent" onClick={async () => {
            await clearWalletFromBackend()
          }}>
            Xóa ví
          </Button>
          <Button className="flex-1" onClick={openInExplorer}>Xem trên Explorer</Button>
        </div>
      </CardContent>
    </Card>
  )
}