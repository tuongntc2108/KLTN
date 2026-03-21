import { translations, Language } from '@/lib/translations'
import { useLanguage } from '@/contexts/language-context'

export function useTranslation() {
  const { language, setLanguage, mounted } = useLanguage()

  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = translations[language]
    
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }
    
    // Fallback to key if not found
    return value !== undefined ? value : key
  }

  return { 
    t, 
    language, 
    setLanguage,
    mounted // To prevent hydration mismatch
  }
}
