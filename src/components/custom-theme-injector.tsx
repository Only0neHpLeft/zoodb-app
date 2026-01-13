"use client"

import { useEffect } from "react"
import { getCustomTheme, generateCustomThemeCss } from "@/lib/custom-theme-manager"

export function CustomThemeInjector() {
    useEffect(() => {
        // Function to update the style tag
        const updateStyles = () => {
            const theme = getCustomTheme()
            const styleId = "custom-theme-style"
            let styleEl = document.getElementById(styleId)

            if (theme) {
                if (!styleEl) {
                    styleEl = document.createElement("style")
                    styleEl.id = styleId
                    document.head.appendChild(styleEl)
                }
                styleEl.textContent = generateCustomThemeCss(theme)
            } else if (styleEl) {
                styleEl.remove()
            }
        }

        // Initial update
        updateStyles()

        // Listen for custom event to update styles when theme is saved
        window.addEventListener("custom-theme-changed", updateStyles)

        return () => {
            window.removeEventListener("custom-theme-changed", updateStyles)
        }
    }, [])

    return null
}
