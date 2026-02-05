import React from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex gap-2">
      <Button
        variant={language === 'en' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLanguage('en')}
        className="gap-2"
      >
        <span className="text-lg">🇬🇧</span>
        <span>EN</span>
      </Button>
      <Button
        variant={language === 'cz' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLanguage('cz')}
        className="gap-2"
      >
        <span className="text-lg">🇨🇿</span>
        <span>CZ</span>
      </Button>
    </div>
  )
}
