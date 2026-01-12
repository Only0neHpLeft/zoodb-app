import * as React from "react"
import { themes, getThemeByValue } from "@/lib/themes"
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

const THEME_STORAGE_KEY = "selected-theme"
const CUSTOM_THEME_KEY = "custom-theme-css"
const THEME_STYLE_ID = "theme-override-style"

// Apply theme CSS to the document
function applyTheme(themeCss: string) {
  let styleEl = document.getElementById(THEME_STYLE_ID)

  if (!styleEl) {
    styleEl = document.createElement("style")
    styleEl.id = THEME_STYLE_ID
    document.head.appendChild(styleEl)
  }

  styleEl.textContent = themeCss
}

// Get stored custom theme CSS
function getCustomThemeCss(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(CUSTOM_THEME_KEY) || ""
}

// Save custom theme CSS
function saveCustomThemeCss(css: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(CUSTOM_THEME_KEY, css)
}

export function ThemeSelector() {
  const { t } = useLanguage()
  const [currentTheme, setCurrentTheme] = React.useState<string>("caffeine")
  const [mounted, setMounted] = React.useState(false)
  const [customCss, setCustomCss] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  // Initialize theme on mount
  React.useEffect(() => {
    setMounted(true)

    // Get saved theme
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "caffeine"
    setCurrentTheme(savedTheme)

    // Load and apply the theme CSS
    if (savedTheme === "custom") {
      const customCss = getCustomThemeCss()
      if (customCss) {
        applyTheme(customCss)
        setCustomCss(customCss)
      }
    } else {
      const theme = getThemeByValue(savedTheme)
      if (theme?.css) {
        applyTheme(theme.css)
      }
    }
  }, [])

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
    if (themeName === currentTheme) return

    setCurrentTheme(themeName)
    localStorage.setItem(THEME_STORAGE_KEY, themeName)

    if (themeName === "custom") {
      const customCss = getCustomThemeCss()
      if (customCss) {
        applyTheme(customCss)
      }
    } else {
      const theme = getThemeByValue(themeName)
      if (theme?.css) {
        applyTheme(theme.css)
      }
    }

    // Dispatch event for other components
    window.dispatchEvent(new Event("theme-changed"))
  }

  const handleSaveCustomTheme = () => {
    saveCustomThemeCss(customCss)
    applyTheme(customCss)
    setCurrentTheme("custom")
    localStorage.setItem(THEME_STORAGE_KEY, "custom")
    setIsDialogOpen(false)

    // Dispatch event for other components
    window.dispatchEvent(new Event("theme-changed"))
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {themes.filter(t => t.value !== "custom").map((theme) => {
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
                  style={{ backgroundColor: theme.preview.light.background }}
                />
                <div className="w-2/3 space-y-1">
                  <div
                    className="h-2 rounded"
                    style={{ backgroundColor: theme.preview.light.primary }}
                  />
                  <div
                    className="h-2 rounded w-3/4"
                    style={{ backgroundColor: theme.preview.light.accent }}
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
                {t.themes?.[theme.value as keyof typeof t.themes]?.name || theme.name}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {t.themes?.[theme.value as keyof typeof t.themes]?.description || theme.description}
              </p>
            </div>
          </button>
        )
      })}

      {/* Import Theme Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <button className="group text-left space-y-2 focus:outline-none">
            <div className={`
              relative border rounded-lg p-4 h-24 transition-all flex flex-col items-center justify-center
              text-muted-foreground hover:text-primary hover:border-primary
              ${currentTheme === "custom" ? 'ring-2 ring-primary' : ''}
            `}>
              {currentTheme === "custom" && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="h-3 w-3" />
                </div>
              )}
              <Upload className="h-6 w-6 mb-2" />
              <span className="text-xs font-medium">Import Theme</span>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Custom</p>
              <p className="text-xs text-muted-foreground">Paste your own CSS theme</p>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Custom Theme</DialogTitle>
            <DialogDescription>
              Paste your TweakCN CSS here. Include both :root and .dark blocks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder={`:root {
  --background: #ffffff;
  --foreground: #000000;
  /* ... */
}
.dark {
  --background: #000000;
  --foreground: #ffffff;
  /* ... */
}`}
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
