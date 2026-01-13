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

export function ThemeSelector() {
  const { t } = useLanguage()
  const [currentTheme, setCurrentTheme] = React.useState<string>("caffeine")
  const [mounted, setMounted] = React.useState(false)
  const [customCss, setCustomCss] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    // Get the current theme from localStorage or data attribute
    const savedTheme = localStorage.getItem('selected-theme')
    const theme = savedTheme || document.documentElement.getAttribute('data-theme') || 'caffeine'
    setCurrentTheme(theme)

    // Ensure the data-theme attribute is set
    if (!document.documentElement.hasAttribute('data-theme')) {
      document.documentElement.setAttribute('data-theme', theme)
    }

    // Load custom CSS if available
    setCustomCss(getCustomThemeRaw())
  }, [])

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {themes.map((theme) => (
          <div key={theme.value} className="space-y-2">
            <div className="border rounded-lg p-4 h-24 bg-muted animate-pulse" />
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
                relative border rounded-lg p-4 h-24 transition-all overflow-hidden
                ${isSelected ? 'ring-2 ring-primary' : 'hover:border-primary'}
              `}
            >
              {/* Theme preview */}
              <div className="flex gap-2 h-full">
                <div
                  className="w-1/3 rounded"
                  style={{
                    backgroundColor: theme.preview.light.background,
                  }}
                />
                <div className="w-2/3 space-y-1">
                  <div
                    className="h-2 rounded"
                    style={{
                      backgroundColor: theme.preview.light.primary,
                    }}
                  />
                  <div
                    className="h-2 rounded w-3/4"
                    style={{
                      backgroundColor: theme.preview.light.accent,
                    }}
                  />
                </div>
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>

            <div className="space-y-1">
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
            <div className="relative border rounded-lg p-4 h-24 transition-all hover:border-primary flex flex-col items-center justify-center text-muted-foreground hover:text-primary">
              <Upload className="h-6 w-6 mb-2" />
              <span className="text-xs font-medium">Import Theme</span>
            </div>
            <div className="space-y-1">
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