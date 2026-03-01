import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/language-context'

interface ProfileData {
  user_id: number
  email: string
  role: string
  full_name: string | null
  avatar_url: string | null
  language: string
  wallet_address?: string | null
  student_id?: number
  organization?: string | null
  website?: string | null
  last_login?: string
  created_at?: string
}

interface ProfileState {
  profile: ProfileData | null
  loading: boolean
  error: string | null
}

export function useProfile() {
  const { language: currentLanguage, setLanguage } = useLanguage()
  const [state, setState] = useState<ProfileState>({
    profile: null,
    loading: true,
    error: null
  })

  const fetchProfile = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/profile`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.profile) {
        // Sync language from DB to localStorage
        if (data.profile.language) {
          const dbLanguage = data.profile.language as 'vi' | 'en'

          if (dbLanguage !== currentLanguage) {
            setLanguage(dbLanguage)
            console.log(`✅ Synced language from profile: ${dbLanguage}`)
          }
        }
        
        setState({
          profile: data.profile,
          loading: false,
          error: null
        })
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Fetch profile error:', error)
      setState({
        profile: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch profile'
      })
    }
  }

  const updateAvatar = async (file: File | Blob): Promise<{ success: boolean; error?: string }> => {
    try {
      const formData = new FormData()
      
      // Handle both File and Blob
      if (file instanceof Blob) {
        formData.append('avatar', file, 'avatar.jpg')
      } else {
        formData.append('avatar', file)
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/avatar`,
        {
          method: 'PUT',
          credentials: 'include',
          body: formData
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || `HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Refresh profile after successful upload
        await fetchProfile()
        return { success: true }
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Update avatar error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update avatar'
      }
    }
  }

  const updateLanguage = async (language: 'vi' | 'en'): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/language`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ language })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || `HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          profile: prev.profile ? { ...prev.profile, language } : null
        }))
        
        // Update shared language state for immediate UI effect
        setLanguage(language)
        
        return { success: true }
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      console.error('Update language error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update language'
      }
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  return {
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    refetch: fetchProfile,
    updateAvatar,
    updateLanguage
  }
}
