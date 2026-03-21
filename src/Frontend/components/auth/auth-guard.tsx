// components/auth/auth-guard.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
  fallbackUrl?: string
}

export function AuthGuard({ children, allowedRoles = [], fallbackUrl = '/auth/login' }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useTranslation()

  useEffect(() => {
    if (!loading) {
      // If not authenticated, redirect to login
      if (!user) {
        router.push(`${fallbackUrl}?redirect=${encodeURIComponent(pathname)}`)
        return
      }

      // If authenticated but doesn't have required role
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // Redirect based on user's actual role
        const roleRedirects = {
          'Admin': '/dashboard/admin',
          'Issuer': '/dashboard/training',
          'Student': '/dashboard/student',
          'User': '/dashboard/student',
          'undefined': '/dashboard/student'
        }
        
        const redirectPath = roleRedirects[user.role as keyof typeof roleRedirects] || '/dashboard/student'
        router.push(redirectPath)
        return
      }
    }
  }, [user, loading, router, pathname, allowedRoles, fallbackUrl])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t('common.authenticating')}</span>
        </div>
      </div>
    )
  }

  // Show content if authenticated and authorized
  if (user && (allowedRoles.length === 0 || allowedRoles.includes(user.role))) {
    return <>{children}</>
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>{t('common.redirecting')}</span>
      </div>
    </div>
  )
}