import { WalletConnect } from "@/components/blockchain/wallet-connect"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Award, ExternalLink, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { useMemo, memo } from "react"


const StudentWalletPage = memo(function StudentWalletPage() {

  // Memoized functions to prevent re-renders
  const getStatusBadge = useMemo(() => (status: string) => {
    switch (status) {
      case "Active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Đã nhận
          </Badge>
        )
      case "Issued":
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
