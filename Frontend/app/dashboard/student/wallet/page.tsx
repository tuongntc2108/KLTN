import { WalletConnect } from "@/components/blockchain/wallet-connect"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Award, ExternalLink, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react"

export default function StudentWalletPage() {
  const nftCertificates = [
    {
      id: 1,
      name: "English Communication B2",
      tokenId: "0x1a2b3c4d5e6f7890",
      status: "active",
      mintDate: "15/11/2024",
      network: "Polygon",
      image: "/certificate-nft-badge.jpg",
    },
    {
      id: 2,
      name: "Advanced Presentation Skills",
      tokenId: "0x4d5e6f7890123456",
      status: "active",
      mintDate: "10/11/2024",
      network: "Polygon",
      image: "/presentation-skills-nft-badge.jpg",
    },
    {
      id: 3,
      name: "Digital Marketing Fundamentals",
      tokenId: "0x7g8h9i0123456789",
      status: "pending",
      mintDate: "05/11/2024",
      network: "Polygon",
      image: "/digital-marketing-nft-badge.jpg",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Đã nhận
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Chờ nhận
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-balance">Ví Blockchain</h1>
        <p className="text-muted-foreground">Quản lý ví và chứng chỉ NFT của bạn</p>
      </div>

      {/* Wallet Connection */}
      <WalletConnect />

      {/* NFT Certificates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Chứng chỉ NFT của tôi
          </CardTitle>
          <CardDescription>Các chứng chỉ số dưới dạng NFT trong ví blockchain</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nftCertificates.map((nft) => (
              <Card key={nft.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                  <img src={nft.image || "/placeholder.svg"} alt={nft.name} className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm">{nft.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">#{nft.tokenId.slice(-8)}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    {getStatusBadge(nft.status)}
                    <span className="text-xs text-muted-foreground">{nft.network}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Mint: {nft.mintDate}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs bg-transparent">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Xem NFT
                    </Button>
                    {nft.status === "pending" && (
                      <Button size="sm" className="flex-1 text-xs">
                        Nhận NFT
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {nftCertificates.length === 0 && (
            <div className="text-center py-12">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Chưa có NFT nào</h3>
              <p className="text-muted-foreground">
                Bạn chưa có chứng chỉ NFT nào. Hoàn thành khóa học để nhận chứng chỉ đầu tiên!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blockchain Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động Blockchain</CardTitle>
          <CardDescription>Lịch sử giao dịch và hoạt động NFT</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                type: "mint",
                description: "Nhận chứng chỉ NFT English Communication B2",
                date: "15/11/2024 14:30",
                txHash: "0xabcd...1234",
                status: "success",
              },
              {
                type: "mint",
                description: "Nhận chứng chỉ NFT Advanced Presentation Skills",
                date: "10/11/2024 09:15",
                txHash: "0xefgh...5678",
                status: "success",
              },
              {
                type: "pending",
                description: "Chờ nhận chứng chỉ NFT Digital Marketing",
                date: "05/11/2024 16:45",
                txHash: "Đang xử lý...",
                status: "pending",
              },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-secondary/20 rounded-full">
                    {activity.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">{activity.txHash}</span>
                  {activity.status === "success" && (
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5" />
            Bảo mật ví blockchain
          </CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-700">
          <ul className="space-y-2 text-sm">
            <li>• Không chia sẻ private key hoặc seed phrase với bất kỳ ai</li>
            <li>• Luôn kiểm tra địa chỉ ví trước khi thực hiện giao dịch</li>
            <li>• Sử dụng hardware wallet cho bảo mật tối đa</li>
            <li>• Cập nhật phần mềm ví thường xuyên</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
