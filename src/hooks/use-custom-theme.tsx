"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { getUserSettings, updateUserSettings } from "@/lib/db/convex-db"

export function useCustomTheme() {
  const [theme, setThemeState] = useState<string>("caffeine")
  const isSyncingRef = useRef(false)
  // Track current user ID in a ref to avoid stale closures
  const userIdRef = useRef<string | null>(null)

  const syncTheme = useCallback(() => {
    const savedTheme = localStorage.getItem("selected-theme") || "caffeine"
    setThemeState(savedTheme)

    // Ensure the data-theme attribute is set
    if (document.documentElement.getAttribute("data-theme") !== savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme)
    }
  }, [])

  // Sync theme with database for logged in user
  const syncWithUser = useCallback(async (userId: string) => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    userIdRef.current = userId

    try {
      const { data: settings } = await getUserSettings(userId)
      if (settings && settings.theme) {
        const dbTheme = settings.theme
        const localTheme = localStorage.getItem("selected-theme")

        if (dbTheme !== localTheme) {
          setThemeState(dbTheme)
          localStorage.setItem("selected-theme", dbTheme)
          document.documentElement.setAttribute("data-theme", dbTheme)
          window.dispatchEvent(new CustomEvent("theme-change"))
        }
      } else {
        // If no DB setting, save current localStorage value to DB
        const localTheme = localStorage.getItem("selected-theme")
        if (localTheme) {
          await updateUserSettings(userId, { theme: localTheme })
        }
      }
    } catch (error) {
      console.error('Failed to sync theme settings:', error)
    } finally {
      isSyncingRef.current = false
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

    // Poll localStorage periodically to catch direct edits (DevTools)
    const pollInterval = setInterval(() => {
      const currentTheme = localStorage.getItem("selected-theme") || "caffeine"
      if (currentTheme !== theme) {
        syncTheme()
      }
    }, 1000)

    return () => {
      observer.disconnect()
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("theme-change", handleThemeChange)
      clearInterval(pollInterval)
    }
  }, [syncTheme, theme])

  const setTheme = useCallback(async (newTheme: string) => {
    setThemeState(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("selected-theme", newTheme)
    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent("theme-change"))

    // If user is logged in, persist to database
    if (userIdRef.current) {
      try {
        await updateUserSettings(userIdRef.current, { theme: newTheme })
      } catch (error) {
        console.error('Failed to save theme to database:', error)
        // localStorage is already set as fallback
      }
    }
  }, [])

  // Clear user ID when user logs out
  const clearUser = useCallback(() => {
    userIdRef.current = null
  }, [])

  return { theme, setTheme, syncWithUser, clearUser }
}