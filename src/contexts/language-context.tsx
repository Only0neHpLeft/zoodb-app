"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { en } from '@/locales/en'
import { cz } from '@/locales/cz'
import { categoriesEn } from '@/locales/categories-en'
import { categoriesCz } from '@/locales/categories-cz'
import { getUserSettings, updateUserSettings } from '@/lib/db/convex-db'

type Language = 'en' | 'cz'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: typeof en | typeof cz
  categoryTranslations: typeof categoriesEn | typeof categoriesCz
  syncWithUser: (userId: string) => Promise<void>
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
    // Initialize from localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language | null
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'cz')) {
        return savedLanguage
      }
    }
    return 'en'
  })
  const [isHydrated, setIsHydrated] = useState(false)
  const currentUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Mark as hydrated after initial mount
    setIsHydrated(true)
  }, [])

  // Sync language with database when user is available
  const syncWithUser = useCallback(async (userId: string) => {
    currentUserIdRef.current = userId
    try {
      const { data: settings } = await getUserSettings(userId)
      if (settings && settings.language) {
        const dbLang = settings.language as Language
        if (dbLang !== language) {
          setLanguageState(dbLang)
          localStorage.setItem('language', dbLang)
        }
      } else {
        // If no DB setting, save current localStorage value to DB
        const localLang = localStorage.getItem('language') as Language | null
        if (localLang) {
          await updateUserSettings(userId, { language: localLang })
        }
      }
    } catch (error) {
      console.error('Failed to sync language settings:', error)
    }
  }, [language])

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)

    // If user is logged in, persist to database
    if (currentUserIdRef.current) {
      try {
        await updateUserSettings(currentUserIdRef.current, { language: lang })
      } catch (error) {
        console.error('Failed to save language to database:', error)
        // localStorage is already set as fallback
      }
    }
  }, [])

  const value = {
    language,
    setLanguage,
    t: translations[language],
    categoryTranslations: categoryTranslations[language],
    syncWithUser,
  }

  // Show nothing until hydrated to prevent language flash
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
