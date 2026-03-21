"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Award, Wallet, User, UserCircle, Menu, Bell, Search, LogOut, Blocks } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Suspense } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { UserAvatar } from "@/components/ui/user-avatar"

function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  
  const navigation = [
    {
      name: t('nav.overview'),
      href: "/dashboard/student",
      icon: User,
    },
    {
      name: t('nav.myCertificates'),
      href: "/dashboard/student/certificates",
      icon: Award,
    },
    {
      name: t('nav.wallet'),
      href: "/dashboard/student/wallet",
      icon: Wallet,
    },
    {
      name: t('nav.profile'),
      href: "/dashboard/student/profile",
      icon: UserCircle,
    },
  ]

  return (
    <div className={cn("flex h-full flex-col bg-sidebar", className)}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-sidebar-primary rounded-lg">
            <Blocks className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">CertChain</h1>
            <p className="text-xs text-sidebar-foreground/60">{t('nav.student')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <UserAvatar 
            avatarUrl={user?.avatar} 
            userName={user?.fullName}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground">{user?.fullName || 'Học viên'}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email || 'Loading...'}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <AuthGuard allowedRoles={['User', 'Student', 'undefined', 'Issuer', 'Admin']}>
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col">
          <Sidebar />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Header */}
          <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <Sidebar />
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <UserAvatar 
                  avatarUrl={user?.avatar} 
                  userName={user?.fullName}
                  size="sm"
                />
                <span className="hidden text-sm font-medium md:inline-block">{user?.fullName || 'Học viên'}</span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
