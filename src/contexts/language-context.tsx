"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { en } from '@/locales/en'
import { cz } from '@/locales/cz'
import { categoriesEn } from '@/locales/categories-en'
import { categoriesCz } from '@/locales/categories-cz'
import type { Translations } from '@/locales/en'

type Language = 'en' | 'cz'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
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

  useEffect(() => {
    // Mark as hydrated after initial mount
    setIsHydrated(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const value = {
    language,
    setLanguage,
    t: translations[language],
    categoryTranslations: categoryTranslations[language],
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
