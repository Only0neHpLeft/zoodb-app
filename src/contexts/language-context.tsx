import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { en } from '@/locales/en'
import { cz } from '@/locales/cz'
import { categoriesEn } from '@/locales/categories-en'
import { categoriesCz } from '@/locales/categories-cz'

type Language = 'en' | 'cz'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language, clerkId?: string) => void
  t: typeof en | typeof cz
  categoryTranslations: typeof categoriesEn | typeof categoriesCz
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations = {
  en,
  cz,
}

const categoryTranslations = {
  en: categoriesEn,
  cz: categoriesCz,
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language | null
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'cz')) {
        return savedLanguage
      }
    }
    return 'en'
  })
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // setLanguage updates localStorage. DB persistence is handled by LanguageDbSync
  // which lives inside ClerkProvider + ConvexClientProvider.
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }, [])

  const value = {
    language,
    setLanguage,
    t: translations[language],
    categoryTranslations: categoryTranslations[language],
  }

  if (!isHydrated) {
    return null
  }

  return (
    <LanguageContext.Provider value={value}>
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
