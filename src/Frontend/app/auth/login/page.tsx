"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from 'next/navigation'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Lock, Eye, EyeOff, Shield, Chrome, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDevMode, setIsDevMode] = useState(false)
  const [devEmail, setDevEmail] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const authParam = searchParams.get('auth')
    
    if (errorParam) {
      switch (errorParam) {
        case 'oauth_failed':
          setError('Đăng nhập Google thất bại. Vui lòng thử lại.')
          break
        case 'invalid_domain':
          setError('Any email can now register as a student.')
          break
        case 'oauth_not_configured':
          setError('Google OAuth chưa được cấu hình. Vui lòng thiết lập thông tin xác thực Google.')
          setIsDevMode(true) // Enable dev mode if OAuth not configured
          break
        case 'callback_failed':
          setError('Có lỗi xảy ra trong quá trình xác thực. Vui lòng thử lại.')
          break
        default:
          setError('Có lỗi xảy ra. Vui lòng thử lại.')
      }
    } else if (authParam === 'success') {
      setSuccess('Đăng nhập thành công! Đang chuyển hướng...')
    }
  }, [searchParams])



  const handleGoogleLogin = () => {
    setLoading(true)
    
    // Redirect to backend OAuth route without user type preference
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    window.location.href = `${backendUrl}/auth/google`
  }

  const handleDevLogin = async () => {
    if (!devEmail || !devEmail.includes('@')) {
      setError('Vui lòng nhập email hợp lệ')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const response = await fetch(`${backendUrl}/auth/dev-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: devEmail
        })
      })

      const data = await response.json()

      if (data.success) {
        window.location.href = data.redirectUrl
      } else {
        setError(data.message)
      }
    } catch (error) {
      console.error('Development login error:', error)
      setError('Đăng nhập thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
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
          <p className="text-gray-600 dark:text-gray-300">Sử dụng tài khoản Google để đăng nhập an toàn</p>
        </div>

        {/* Center the login form */}
        <div className="flex justify-center">
          <div className="w-full max-w-md space-y-6">
            {/* Error/Success Messages */}
            {(error || success) && (
              <div className="mb-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="border-green-200 bg-green-50 text-green-800">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
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
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 ring-1 ring-blue-400/40 hover:from-blue-700 hover:to-indigo-700 transition-colors"
                  style={{ color: 'white !important' }}
                >
                  <Chrome className="w-5 h-5 mr-3" style={{ color: 'white !important' }} />
                  <span style={{ color: 'white !important' }}>
                    {loading ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}
                  </span>
                </Button>

                {/* Development Login (only shown if OAuth not configured) */}
                {isDevMode && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      <div className="text-center">
                        <Badge variant="outline" className="text-xs">
                          Chế độ phát triển
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dev-email">Email thử nghiệm</Label>
                        <Input
                          id="dev-email"
                          type="email"
                          placeholder="example@gmail.com"
                          value={devEmail}
                          onChange={(e) => setDevEmail(e.target.value)}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Có thể đăng nhập với bất kỳ email nào
                        </p>
                      </div>
                      <Button
                        onClick={handleDevLogin}
                        disabled={loading || !devEmail}
                        variant="outline"
                        className="w-full"
                      >
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập thử nghiệm'}
                      </Button>
                    </div>
                  </>
                )}
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
