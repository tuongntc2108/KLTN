"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, CheckCircle, Copy, ExternalLink, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface WalletInfo {
  address: string
  network: string
  balance: string
  isConnected: boolean
}

export function WalletConnect() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  // Mock wallet connection
  const connectWallet = async () => {
    setIsConnecting(true)
    try {
      // Simulate wallet connection
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const mockWallet: WalletInfo = {
        address: "0x742d35Cc6634C0532925a3b8D41C71D3d9C8b663",
        network: "Polygon Mainnet",
        balance: "0.05 MATIC",
        isConnected: true,
      }

      setWalletInfo(mockWallet)
      toast({
        title: "Kết nối ví thành công",
        description: "Ví blockchain đã được kết nối và sẵn sàng sử dụng",
      })
    } catch (error) {
      toast({
        title: "Lỗi kết nối ví",
        description: "Không thể kết nối với ví blockchain. Vui lòng thử lại.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWalletInfo(null)
    toast({
      title: "Đã ngắt kết nối ví",
      description: "Ví blockchain đã được ngắt kết nối",
    })
  }

  const copyAddress = () => {
    if (walletInfo?.address) {
      navigator.clipboard.writeText(walletInfo.address)
      toast({
        title: "Đã sao chép",
        description: "Địa chỉ ví đã được sao chép vào clipboard",
      })
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

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
              <Button variant="ghost" size="sm">
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
          <Button variant="outline" className="flex-1 bg-transparent" onClick={disconnectWallet}>
            Ngắt kết nối
          </Button>
          <Button className="flex-1">Xem trên Explorer</Button>
        </div>
      </CardContent>
    </Card>
  )
}
