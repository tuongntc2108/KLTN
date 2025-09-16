"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Mail, Lock, Eye, EyeOff, Shield, GraduationCap, Building2, UserCheck, Chrome } from "lucide-react"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [userType, setUserType] = useState<"training" | "student" | "admin">("student")

  const userTypes = [
    {
      id: "student",
      label: "Học viên",
      icon: GraduationCap,
      description: "Nhận và quản lý chứng chỉ NFT",
      color: "bg-blue-100 text-blue-800",
    },
    {
      id: "training",
      label: "Đơn vị đào tạo",
      icon: Building2,
      description: "Cấp phát và quản lý chứng chỉ",
      color: "bg-green-100 text-green-800",
    },
    {
      id: "admin",
      label: "Quản trị viên",
      icon: Shield,
      description: "Quản lý toàn bộ hệ thống",
      color: "bg-purple-100 text-purple-800",
    },
  ]

  const handleGoogleLogin = () => {
    // Simulate Google OAuth login
    console.log("[v0] Google login initiated for user type:", userType)

    // Redirect based on user type
    const redirectPaths = {
      student: "/dashboard/student",
      training: "/dashboard/training",
      admin: "/dashboard/admin",
    }

    // In real implementation, this would handle OAuth flow
    window.location.href = redirectPaths[userType]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">CertChain</h1>
          </div>
          <h2 className="text-xl font-semibold" style={{color: '#ffffff'}}>Đăng nhập hệ thống</h2>
          <p className="text-gray-600 dark:text-gray-300">Chọn loại tài khoản và đăng nhập để tiếp tục</p>
        </div>

        {/* Desktop grid: left (roles) | right (login + security). Mobile: stacked */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: User Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chọn loại tài khoản</CardTitle>
              <CardDescription>Vui lòng chọn vai trò phù hợp với bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {userTypes.map((type) => {
                const Icon = type.icon
                return (
                  <div
                    key={type.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      userType === type.id ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setUserType(type.id as any)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${type.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{type.label}</h3>
                          {userType === type.id && (
                            <Badge variant="default" className="text-xs">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Đã chọn
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{type.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Right: Login + Security */}
          <div className="space-y-6">
            {/* Login Form */}
            <Card>
              <CardHeader>
                <CardTitle>Đăng nhập</CardTitle>
                <CardDescription>Sử dụng tài khoản Google để đăng nhập an toàn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Google Login Button - emphasized */}
                <Button
                  onClick={handleGoogleLogin}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 ring-1 ring-blue-400/40 hover:from-blue-700 hover:to-indigo-700 transition-colors"
                  style={{ color: 'white !important' }}
                >
                  <Chrome className="w-5 h-5 mr-3" style={{ color: 'white !important' }} />
                  <span style={{ color: 'white !important' }}>Đăng nhập với Google</span>
                </Button>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Bảo mật cao với Blockchain</p>
                    <p>
                      Hệ thống sử dụng công nghệ blockchain để đảm bảo tính toàn vẹn và bảo mật cho tất cả chứng chỉ số.
                      Thông tin của bạn được mã hóa và bảo vệ tuyệt đối.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>
            Bằng việc đăng nhập, bạn đồng ý với{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Chính sách bảo mật
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
