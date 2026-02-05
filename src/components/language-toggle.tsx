import * as React from "react"
import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <span className="text-sm font-medium">EN</span>
      </Button>
    )
  }

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'cz' : 'en')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="relative"
    >
      <span className="text-sm font-medium">
        {language === 'en' ? 'EN' : 'CZ'}
      </span>
      <span className="sr-only">Toggle language</span>
    </Button>
  )
}
