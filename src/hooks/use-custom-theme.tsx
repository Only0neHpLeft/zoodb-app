import { useEffect, useState, useCallback } from "react"
import { useSession } from "@/lib/auth-client"
import { useUpdateSettings } from "@/lib/db/convex-db"

export function useCustomTheme() {
  const [theme, setThemeState] = useState<string>("caffeine")

  const { data: session } = useSession()
  const userId = session?.user?.id ?? undefined
  const updateSettings = useUpdateSettings()

  const syncTheme = useCallback(() => {
    const savedTheme = localStorage.getItem("selected-theme") || "caffeine"
    setThemeState(savedTheme)

    if (document.documentElement.getAttribute("data-theme") !== savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme)
    }
  }, [])

  useEffect(() => {
    // Initialize theme from localStorage or default
    syncTheme()

    // Watch for changes to the data-theme attribute
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          const newTheme = document.documentElement.getAttribute("data-theme") || "caffeine"
          setThemeState(newTheme)
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })

    // Listen for storage events (changes from other tabs or direct localStorage edits)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selected-theme") {
        syncTheme()
      }
    }
    window.addEventListener("storage", handleStorageChange)

    // Listen for custom theme-change events (for same-tab updates)
    const handleThemeChange = () => syncTheme()
    window.addEventListener("theme-change", handleThemeChange)

    return () => {
      observer.disconnect()
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("theme-change", handleThemeChange)
    }
  }, [syncTheme])

  const setTheme = useCallback(async (newTheme: string) => {
    setThemeState(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("selected-theme", newTheme)
    window.dispatchEvent(new CustomEvent("theme-change"))

    // If user is logged in, persist to database
    if (userId) {
      try {
        await updateSettings({ userId, theme: newTheme })
      } catch (error) {
        console.error('Failed to save theme to database:', error)
      }
    }
  }, [userId, updateSettings])

  return { theme, setTheme }
}
