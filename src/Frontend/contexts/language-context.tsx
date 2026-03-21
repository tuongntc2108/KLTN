"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'vi' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  mounted: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('vi')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let isActive = true

    const bootstrapLanguage = async () => {
      // Load language from localStorage on mount
      const savedLanguage = localStorage.getItem('language') as Language | null
      if (savedLanguage && (savedLanguage === 'vi' || savedLanguage === 'en')) {
        if (isActive) {
          setLanguageState(savedLanguage)
        }
      }

      setMounted(true)

      // Prefer DB language when user is authenticated
      try {
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

        if (!response.ok) return

        const data = await response.json()
        const dbLanguage = data?.profile?.language as Language | undefined

        if (dbLanguage && (dbLanguage === 'vi' || dbLanguage === 'en')) {
          if (isActive) {
            setLanguageState(dbLanguage)
            localStorage.setItem('language', dbLanguage)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch profile language:', error)
      }
    }

    bootstrapLanguage()

    return () => {
      isActive = false
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, mounted }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
