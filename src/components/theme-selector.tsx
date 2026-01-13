import * as React from "react"
import { themes } from "@/lib/themes"
import { Check, Upload } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { saveCustomTheme, getCustomThemeRaw } from "@/lib/custom-theme-manager"

// Card colors for the grid
const CARD_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ec4899', '#06b6d4']

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
              {/* Colored progress bar at bottom */}
              <div
                className="h-0.5 w-full"
                style={{
                  backgroundColor: CARD_COLORS[i % CARD_COLORS.length],
                  opacity: i < 6 ? 0.8 : 0.3
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
  const { t } = useLanguage()
  const [currentTheme, setCurrentTheme] = React.useState<string>("caffeine")
  const [mounted, setMounted] = React.useState(false)
  const [customCss, setCustomCss] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isDarkMode, setIsDarkMode] = React.useState(false)

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

    // Load custom CSS if available
    setCustomCss(getCustomThemeRaw())

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

  const handleSaveCustomTheme = () => {
    saveCustomTheme(customCss)

    // Dispatch event to update styles
    window.dispatchEvent(new Event("custom-theme-changed"))

    // Select the custom theme
    handleThemeSelect("custom")

    setIsDialogOpen(false)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {themes.map((theme) => {
        const isSelected = currentTheme === theme.value

        return (
          <button
            key={theme.value}
            onClick={() => handleThemeSelect(theme.value)}
            className="group text-left space-y-2 focus:outline-none"
          >
            <div
              className={`
                relative border rounded-lg p-1.5 h-32 transition-all overflow-hidden
                ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:border-primary'}
              `}
            >
              {/* Theme preview mockup */}
              <ThemeMockup theme={theme} isDark={isDarkMode} />

              {isSelected && (
                <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <p className="font-medium text-sm">
                {t.themes[theme.value as keyof typeof t.themes]?.name || theme.name}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {t.themes[theme.value as keyof typeof t.themes]?.description || theme.description}
              </p>
            </div>
          </button>
        )
      })}

      {/* Import Theme Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <button className="group text-left space-y-2 focus:outline-none">
            <div className="relative border rounded-lg p-1.5 h-32 transition-all hover:border-primary flex flex-col items-center justify-center text-muted-foreground hover:text-primary border-dashed">
              <Upload className="h-6 w-6 mb-2" />
              <span className="text-xs font-medium">Import Theme</span>
            </div>
            <div className="space-y-0.5">
              <p className="font-medium text-sm">Import</p>
              <p className="text-xs text-muted-foreground">Paste your own CSS theme</p>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Custom Theme</DialogTitle>
            <DialogDescription>
              Paste your CSS variables here. Supports :root and .dark blocks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder=":root { --background: ... }"
              className="h-[300px] font-mono text-xs"
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCustomTheme}>Save Theme</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
