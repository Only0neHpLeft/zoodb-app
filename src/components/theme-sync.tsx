"use client"

import { useEffect } from "react"

/**
 * Component to ensure theme stays synchronized between localStorage,
 * data-theme attribute, and React state
 */
export function ThemeSync() {
  useEffect(() => {
    // Ensure the initial theme is set correctly
    const savedTheme = localStorage.getItem("selected-theme")
    if (savedTheme) {
      const currentTheme = document.documentElement.getAttribute("data-theme")
      if (currentTheme !== savedTheme) {
        // Clear any existing theme first
        document.documentElement.removeAttribute("data-theme")
        // Force reflow
        void document.documentElement.offsetHeight
        // Apply saved theme
        document.documentElement.setAttribute("data-theme", savedTheme)
      }
    } else {
      // Set default theme if none exists
      const defaultTheme = "eyesight"
      document.documentElement.setAttribute("data-theme", defaultTheme)
      localStorage.setItem("selected-theme", defaultTheme)
    }

    // Watch for theme changes and ensure they're properly applied
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          const newTheme = document.documentElement.getAttribute("data-theme")
          if (newTheme) {
            // Force a repaint to ensure all CSS variables are recalculated
            const style = document.createElement("style")
            style.textContent = `* { --force-repaint: ${Date.now()}; }`
            document.head.appendChild(style)
            requestAnimationFrame(() => {
              document.head.removeChild(style)
            })
          }
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })

    return () => observer.disconnect()
  }, [])

  return null
}