import { WalletConnect } from "@/components/blockchain/wallet-connect"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Award, ExternalLink, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { useMemo, memo } from "react"

// Static data to prevent re-renders
const NFT_CERTIFICATES = [
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


const StudentWalletPage = memo(function StudentWalletPage() {

  // Memoized functions to prevent re-renders
  const getStatusBadge = useMemo(() => (status: string) => {
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
  }, [])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-balance">Ví Blockchain</h1>
        <p className="text-muted-foreground">Quản lý ví và chứng chỉ NFT của bạn</p>
      </div>

      {/* Wallet Connection */}
      <WalletConnect />
    </div>
  )
})

export default StudentWalletPage
