import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Award, Users, Search, ChevronRight, Blocks, Lock, Zap } from "lucide-react"
import Link from "next/link"
import { VerifySection } from "@/components/landing/verify-section"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Blocks className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">CertChain</h1>
                <p className="text-xs text-muted-foreground">Blockchain Certificate System</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Tính năng
              </Link>
              <Link href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                Cách hoạt động
              </Link>
              <Link href="#verify" className="text-muted-foreground hover:text-foreground transition-colors">
                Xác minh chứng chỉ
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,_rgba(59,130,246,0.25),_transparent_60%)]" />
        <div className="container relative mx-auto text-center max-w-3xl">
          <Badge variant="secondary" className="mb-6 bg-secondary/20 text-secondary-foreground/90 border-0">
            <Zap className="w-4 h-4 mr-2" />
            Công nghệ Blockchain & NFT
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-balance mb-6">
            Hệ thống cấp phát 
            <br></br>
            chứng chỉ số
            <span className="block text-primary">an toàn và minh bạch</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground/90 text-pretty mb-10 max-w-2xl mx-auto">
            Ứng dụng công nghệ Blockchain và NFT để tạo ra hệ thống chứng chỉ không thể giả mạo, hỗ trợ đơn vị đào tạo,
            học viên và nhà tuyển dụng.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="text-lg px-8 shadow-lg shadow-primary/20 cursor-pointer">
                Bắt đầu ngay
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/verify">
              <Button variant="outline" size="lg" className="text-lg px-8 bg-transparent border-border/40 text-foreground/90 cursor-pointer">
                Xác minh chứng chỉ
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Dành cho mọi đối tượng</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Hệ thống được thiết kế để phục vụ tất cả các bên liên quan trong quá trình đào tạo và tuyển dụng
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Training Institution */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-secondary/20">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Award className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle className="text-xl">Đơn vị đào tạo</CardTitle>
                <CardDescription>Cấp phát và quản lý chứng chỉ số một cách minh bạch</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Tạo và cấp chứng chỉ NFT</li>
                  <li>• Quản lý học viên theo khóa học</li>
                  <li>• Theo dõi trạng thái chứng chỉ</li>
                  <li>• Thu hồi hoặc cập nhật chứng chỉ</li>
                </ul>
              </CardContent>
            </Card>

            {/* Student */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-secondary/20">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Users className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle className="text-xl">Học viên</CardTitle>
                <CardDescription>Nhận và quản lý chứng chỉ số cá nhân</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Nhận chứng chỉ NFT vào ví blockchain</li>
                  <li>• Quản lý danh sách chứng chỉ</li>
                  <li>• Chia sẻ chứng chỉ với nhà tuyển dụng</li>
                  <li>• Tải xuống file PDF chứng chỉ</li>
                </ul>
              </CardContent>
            </Card>

            {/* Employer */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-secondary/20">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Search className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle className="text-xl">Nhà tuyển dụng</CardTitle>
                <CardDescription>Tra cứu và xác minh chứng chỉ ứng viên</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Xác minh tính hợp lệ chứng chỉ</li>
                  <li>• Xem lịch sử trạng thái chứng chỉ</li>
                  <li>• Tóm tắt nội dung đào tạo bằng AI</li>
                  <li>• Không cần đăng ký tài khoản</li>
                </ul>
              </CardContent>
            </Card>

            {/* Admin */}
            <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-secondary/20">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Shield className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle className="text-xl">Quản trị viên</CardTitle>
                <CardDescription>Quản lý toàn bộ hệ thống và người dùng</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Quản lý đơn vị đào tạo</li>
                  <li>• Cấu hình hệ thống</li>
                  <li>• Theo dõi hoạt động tổng thể</li>
                  <li>• Báo cáo và thống kê</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Tính năng nổi bật</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ứng dụng công nghệ Blockchain và NFT để đảm bảo tính bảo mật và minh bạch tuyệt đối
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Không thể giả mạo</h3>
              <p className="text-muted-foreground">
                Mỗi chứng chỉ được mã hóa thành Soulbound Token (SBT) trên blockchain, đảm bảo không thể chuyển nhượng
                hay giả mạo.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Blocks className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Minh bạch và truy vết</h3>
              <p className="text-muted-foreground">
                Toàn bộ quá trình cấp phát và quản lý chứng chỉ được ghi lại trên blockchain, có thể truy vết và kiểm
                tra bất cứ lúc nào.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Tích hợp AI thông minh</h3>
              <p className="text-muted-foreground">
                Chatbot AI hỗ trợ người dùng và tính năng tóm tắt nội dung đào tạo giúp nhà tuyển dụng đánh giá ứng viên
                hiệu quả.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 px-4 bg-card/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Cách thức hoạt động</h2>
            <p className="text-muted-foreground text-lg">Quy trình đơn giản và hiệu quả cho tất cả các bên tham gia</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Đào tạo và cấp chứng chỉ</h3>
              <p className="text-muted-foreground text-sm">
                Đơn vị đào tạo hoàn thành khóa học và tạo chứng chỉ NFT cho học viên thông qua hệ thống.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Học viên nhận chứng chỉ</h3>
              <p className="text-muted-foreground text-sm">
                Học viên nhận chứng chỉ NFT vào ví blockchain cá nhân và có thể quản lý, chia sẻ khi cần.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Xác minh và tuyển dụng</h3>
              <p className="text-muted-foreground text-sm">
                Nhà tuyển dụng xác minh chứng chỉ ngay lập tức và nhận tóm tắt nội dung đào tạo từ AI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Verify Section */}
      <VerifySection />

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                  <Blocks className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold">CertChain</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Hệ thống cấp phát chứng chỉ số an toàn và minh bạch sử dụng công nghệ Blockchain.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Sản phẩm</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Đơn vị đào tạo
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Học viên
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Nhà tuyển dụng
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    API Documentation
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Hướng dẫn sử dụng
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Liên hệ
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Báo lỗi
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Pháp lý</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Điều khoản sử dụng
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Chính sách bảo mật
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Cookies
                  </Link>
                </li>
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
