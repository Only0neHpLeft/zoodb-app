"use client"

import { useEffect } from "react"
import { getThemeByValue } from "@/lib/themes"

const THEME_STORAGE_KEY = "selected-theme"
const CUSTOM_THEME_KEY = "custom-theme-css"
const THEME_STYLE_ID = "theme-override-style"

function applyTheme(themeCss: string) {
    let styleEl = document.getElementById(THEME_STYLE_ID)

    if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = THEME_STYLE_ID
        document.head.appendChild(styleEl)
    }

    styleEl.textContent = themeCss
}

export function CustomThemeInjector() {
    useEffect(() => {
        // Function to apply the saved theme on initial load
        const applyInitialTheme = () => {
            const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "caffeine"

            if (savedTheme === "custom") {
                const customCss = localStorage.getItem(CUSTOM_THEME_KEY)
                if (customCss) {
                    applyTheme(customCss)
                }
            } else {
                const theme = getThemeByValue(savedTheme)
                if (theme?.css) {
                    applyTheme(theme.css)
                }
            }
        }

        // Apply theme on mount
        applyInitialTheme()

        // Listen for theme change events from theme-selector
        const handleThemeChange = () => {
            applyInitialTheme()
        }

        window.addEventListener("theme-changed", handleThemeChange)

        return () => {
            window.removeEventListener("theme-changed", handleThemeChange)
        }
    }, [])

    return null
}
