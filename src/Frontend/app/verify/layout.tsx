import type React from "react"
import { Button } from "@/components/ui/button"
import { Blocks, Home, HelpCircle, Mail } from "lucide-react"
import Link from "next/link"

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Blocks className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">CertChain</h1>
                <p className="text-xs text-muted-foreground">Xác minh chứng chỉ</p>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Trang chủ
              </Link>
              <Link
                href="/verify/help"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                Hướng dẫn
              </Link>
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Liên hệ hỗ trợ
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8 px-4 mt-16">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                  <Blocks className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold">CertChain Verify</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Hệ thống xác minh chứng chỉ số an toàn và minh bạch sử dụng công nghệ Blockchain.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Hỗ trợ nhà tuyển dụng</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/verify/help" className="hover:text-foreground transition-colors">
                    Hướng dẫn xác minh
                  </Link>
                </li>
                <li>
                  <Link href="/verify/api" className="hover:text-foreground transition-colors">
                    API Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/verify/bulk" className="hover:text-foreground transition-colors">
                    Xác minh hàng loạt
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Liên hệ</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Email: verify@certchain.vn</li>
                <li>Hotline: 1900-xxxx</li>
                <li>Thời gian hỗ trợ: 8:00 - 17:00</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 CertChain. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
