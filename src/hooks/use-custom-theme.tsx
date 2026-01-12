"use client"

import { useEffect, useState, useCallback } from "react"

export function useCustomTheme() {
  const [theme, setThemeState] = useState<string>("caffeine")

  const syncTheme = useCallback(() => {
    const savedTheme = localStorage.getItem("selected-theme") || "caffeine"
    setThemeState(savedTheme)

    // Ensure the data-theme attribute is set
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

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme)
    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("selected-theme", newTheme)
    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent("theme-change"))
  }

  return { theme, setTheme }
}