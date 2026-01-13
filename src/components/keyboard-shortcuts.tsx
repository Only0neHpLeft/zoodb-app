"use client"

import { useEffect } from "react"

export function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+R (Mac) or CTRL+R (Windows) - Reload page
      if (e.key === "r" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        window.location.reload()
      }

      // CMD+SHIFT+R (Mac) or CTRL+SHIFT+R (Windows) - Hard reload (clear cache)
      if (e.key === "R" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        // Force reload without cache
        window.location.href = window.location.href
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  return null
}
