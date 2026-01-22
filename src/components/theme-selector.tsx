import * as React from "react"
import { themes } from "@/lib/themes"
import { Check, Lock, Clock } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useMembership } from "@/contexts/membership-context"

// Themes that are free (available to all users)
const FREE_THEMES = ['caffeine']

// Mini App Mockup Component - Realistic app preview
function ThemeMockup({ theme, isDark }: { theme: typeof themes[number]; isDark: boolean }) {
  const colors = isDark ? theme.preview.dark : theme.preview.light
  const textColor = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)'
  const mutedColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'

  return (
    <div
      className="w-full h-full flex rounded-sm overflow-hidden"
      style={{ backgroundColor: colors.background }}
    >
      {/* Sidebar */}
      <div
        className="w-[30%] flex flex-col py-1.5 px-1 border-r"
        style={{
          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          borderColor: borderColor
        }}
      >
        {/* App Logo/Title */}
        <div className="flex items-center gap-1 mb-2 px-0.5">
          <div
            className="h-2.5 w-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: colors.primary }}
          />
          <div className="flex flex-col gap-0.5 min-w-0">
            <div
              className="h-1 w-6 rounded-sm"
              style={{ backgroundColor: textColor, opacity: 0.8 }}
            />
            <div
              className="h-0.5 w-4 rounded-sm"
              style={{ backgroundColor: mutedColor }}
            />
          </div>
        </div>

        {/* Nav Section Label */}
        <div
          className="h-0.5 w-4 rounded-sm mb-1 ml-0.5"
          style={{ backgroundColor: mutedColor, opacity: 0.5 }}
        />

        {/* Nav Items */}
        <div className="flex flex-col gap-0.5 mb-2">
          {/* Active nav item */}
          <div
            className="h-1.5 rounded-sm"
            style={{ backgroundColor: colors.accent }}
          />
          <div
            className="h-1.5 rounded-sm"
            style={{ backgroundColor: 'transparent' }}
          />
          <div
            className="h-1.5 rounded-sm"
            style={{ backgroundColor: 'transparent' }}
          />
        </div>

        {/* Schema Section Label */}
        <div
          className="h-0.5 w-3 rounded-sm mb-1 ml-0.5"
          style={{ backgroundColor: mutedColor, opacity: 0.5 }}
        />

        {/* Schema Items with badges */}
        <div className="flex flex-col gap-0.5 flex-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between px-0.5">
              <div
                className="h-1 w-5 rounded-sm"
                style={{ backgroundColor: mutedColor, opacity: 0.6 }}
              />
              <div
                className="h-1 w-2 rounded-sm"
                style={{ backgroundColor: colors.primary, opacity: 0.4 }}
              />
            </div>
          ))}
        </div>

        {/* User at bottom */}
        <div className="flex items-center gap-1 mt-auto pt-1 border-t" style={{ borderColor }}>
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: colors.primary, opacity: 0.6 }}
          />
          <div
            className="h-1 w-4 rounded-sm"
            style={{ backgroundColor: mutedColor }}
          />
        </div>
      </div>

      {/* Main Content - Card Grid */}
      <div className="flex-1 flex flex-col p-1.5 overflow-hidden">
        {/* Card Grid - 4 columns, 3 rows */}
        <div className="grid grid-cols-4 gap-1 flex-1">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="rounded-sm flex flex-col overflow-hidden"
              style={{ backgroundColor: cardBg, border: `0.5px solid ${borderColor}` }}
            >
              {/* Card content area */}
              <div className="flex-1 p-0.5">
                {/* Icon placeholder */}
                <div
                  className="h-1.5 w-1.5 rounded-sm mb-0.5"
                  style={{
                    backgroundColor: i === 0 ? colors.primary : mutedColor,
                    opacity: i === 0 ? 1 : 0.3
                  }}
                />
              </div>
              {/* Colored progress bar at bottom - use theme primary */}
              <div
                className="h-0.5 w-full"
                style={{
                  backgroundColor: colors.primary,
                  opacity: i < 6 ? 0.8 : 0.4
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ThemeSelector() {
  const { t, language } = useLanguage()
  const { membership } = useMembership()
  const [currentTheme, setCurrentTheme] = React.useState<string>("caffeine")
  const [mounted, setMounted] = React.useState(false)
  const [isDarkMode, setIsDarkMode] = React.useState(false)

  // Check if user has premium membership (Zoo or Zoo+)
  const hasPremium = membership?.plan_type === 'zoo' || membership?.plan_type === 'zooPlus'

  React.useEffect(() => {
    setMounted(true)
    // Get the current theme from localStorage or data attribute
    const savedTheme = localStorage.getItem('selected-theme')
    const theme = savedTheme || document.documentElement.getAttribute('data-theme') || 'caffeine'
    setCurrentTheme(theme)

    // Check if dark mode is active
    setIsDarkMode(document.documentElement.classList.contains('dark'))

    // Ensure the data-theme attribute is set
    if (!document.documentElement.hasAttribute('data-theme')) {
      document.documentElement.setAttribute('data-theme', theme)
    }

    // Listen for dark mode changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'))
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })

    return () => observer.disconnect()
  }, [])

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {themes.map((theme) => (
          <div key={theme.value} className="space-y-2">
            <div className="border rounded-lg p-1.5 h-32 bg-muted animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  const handleThemeSelect = (themeName: string) => {
    // Don't do anything if already selected
    if (themeName === currentTheme) return

    // Check if theme requires premium
    const isFreeTheme = FREE_THEMES.includes(themeName)
    if (!isFreeTheme && !hasPremium) {
      // Theme is locked - don't allow selection
      return
    }

    // Remove the old theme attribute first to force a complete CSS recalculation
    document.documentElement.removeAttribute('data-theme')

    // Force a reflow to ensure the removal is processed
    void document.documentElement.offsetHeight

    // Update state immediately
    setCurrentTheme(themeName)

    // Apply the new theme data attribute
    document.documentElement.setAttribute('data-theme', themeName)

    // Store in localStorage for persistence
    localStorage.setItem('selected-theme', themeName)
  }

  // Coming Soon text based on language
  const comingSoonText = language === 'cs' ? 'Brzy' : 'Coming Soon'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {themes.map((theme) => {
        const isSelected = currentTheme === theme.value
        const isFreeTheme = FREE_THEMES.includes(theme.value)
        const isLocked = !isFreeTheme && !hasPremium

        return (
          <button
            key={theme.value}
            onClick={() => handleThemeSelect(theme.value)}
            disabled={isLocked}
            className={`group text-left space-y-2 focus:outline-none ${isLocked ? 'cursor-not-allowed' : ''}`}
          >
            <div
              className={`
                relative border rounded-lg p-1.5 h-32 transition-all overflow-hidden
                ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                ${isLocked ? 'opacity-60' : 'hover:border-primary'}
              `}
            >
              {/* Theme preview mockup */}
              <ThemeMockup theme={theme} isDark={isDarkMode} />

              {/* Lock overlay for premium themes */}
              {isLocked && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <div className="bg-muted rounded-full p-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}

              {isSelected && !isLocked && (
                <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <p className={`font-medium text-sm ${isLocked ? 'text-muted-foreground' : ''}`}>
                  {t.themes[theme.value as keyof typeof t.themes]?.name || theme.name}
                </p>
                {isLocked && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                    Zoo+
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {t.themes[theme.value as keyof typeof t.themes]?.description || theme.description}
              </p>
            </div>
          </button>
        )
      })}

      {/* Coming Soon Placeholder 1 */}
      <div className="text-left space-y-2">
        <div className="relative border border-dashed rounded-lg p-1.5 h-32 flex flex-col items-center justify-center bg-muted/30">
          <Clock className="h-6 w-6 text-muted-foreground mb-2" />
          <span className="text-xs font-medium text-muted-foreground">{comingSoonText}</span>
        </div>
        <div className="space-y-0.5">
          <p className="font-medium text-sm text-muted-foreground">{comingSoonText}</p>
          <p className="text-xs text-muted-foreground">???</p>
        </div>
      </div>

      {/* Coming Soon Placeholder 2 */}
      <div className="text-left space-y-2">
        <div className="relative border border-dashed rounded-lg p-1.5 h-32 flex flex-col items-center justify-center bg-muted/30">
          <Clock className="h-6 w-6 text-muted-foreground mb-2" />
          <span className="text-xs font-medium text-muted-foreground">{comingSoonText}</span>
        </div>
        <div className="space-y-0.5">
          <p className="font-medium text-sm text-muted-foreground">{comingSoonText}</p>
          <p className="text-xs text-muted-foreground">???</p>
        </div>
      </div>
    </div>
  )
}
