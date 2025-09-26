// hooks/use-auth.ts
import { useState, useEffect } from 'react'

interface User {
  email: string
  fullName: string
  avatar: string
  role: string
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/me`, {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          setAuthState({
            user: data.user,
            loading: false,
            error: null
          })
        } else {
          setAuthState({
            user: null,
            loading: false,
            error: null
          })
        }
      } else {
        setAuthState({
          user: null,
          loading: false,
          error: null
        })
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setAuthState({
        user: null,
        loading: false,
        error: 'Failed to check authentication'
      })
    }
  }

  const logout = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setAuthState({
          user: null,
          loading: false,
          error: null
        })
        // Redirect to login page
        window.location.href = '/auth/login'
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    logout,
    refreshAuth: checkAuth
  }
}