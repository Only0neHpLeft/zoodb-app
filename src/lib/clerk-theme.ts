import { themes, type ThemeName } from "./themes"

// Button colors per theme (darker colors suitable for button backgrounds with white text)
const buttonColors: Record<string, { light: string; dark: string }> = {
  caffeine: { light: "#4a3728", dark: "#5c4433" },
  eyesight: { light: "#6b5b8a", dark: "#7a6b99" },
  claymorphism: { light: "#4f46e5", dark: "#5b52e8" },
  mono: { light: "#404040", dark: "#525252" },
  custom: { light: "#333333", dark: "#444444" },
}

/**
 * Generate Clerk appearance config based on current theme
 */
export function getClerkAppearance(themeName: ThemeName, isDark: boolean) {
  const theme = themes.find((t) => t.value === themeName) || themes[1] // Default to Caffeine
  const colors = isDark ? theme.preview.dark : theme.preview.light
  const btnColor = buttonColors[themeName] || buttonColors.caffeine
  const buttonBg = isDark ? btnColor.dark : btnColor.light

  return {
    variables: {
      colorPrimary: buttonBg, // Used for buttons
      colorBackground: colors.background,
      colorInputBackground: isDark ? colors.accent : colors.background,
      colorInputText: isDark ? colors.primary : "#1a1a1a",
      colorText: isDark ? colors.primary : "#1a1a1a",
      colorTextSecondary: isDark ? `${colors.primary}cc` : "#666666",
      colorDanger: "#ef4444",
      colorSuccess: "#22c55e",
      colorWarning: "#f59e0b",
      borderRadius: "0.5rem",
      fontFamily: "inherit",
    },
    elements: {
      rootBox: "mx-auto",
      card: `shadow-lg border ${isDark ? "bg-[" + colors.background + "] border-[" + colors.accent + "]" : "bg-white border-gray-200"}`,
      headerTitle: isDark ? `text-[${colors.primary}]` : "text-gray-900",
      headerSubtitle: isDark ? `text-[${colors.primary}]/70` : "text-gray-600",
      formButtonPrimary: `bg-[${buttonBg}] hover:bg-[${buttonBg}]/90 text-white`,
      formFieldLabel: isDark ? `text-[${colors.primary}]` : "text-gray-700",
      formFieldInput: isDark
        ? `bg-[${colors.accent}] border-[${colors.accent}] text-[${colors.primary}] placeholder:text-[${colors.primary}]/50`
        : "bg-white border-gray-300",
      footerActionLink: `text-[${colors.primary}] hover:opacity-80`,
      identityPreviewText: isDark ? `text-[${colors.primary}]` : "text-gray-900",
      identityPreviewEditButton: `text-[${colors.primary}]`,
      // Hide OAuth/social buttons - they don't work in Tauri webview
      socialButtonsBlockButton: "hidden",
      socialButtonsBlockButtonText: "hidden",
      dividerRow: "hidden",
      dividerText: "hidden",
      dividerLine: "hidden",
    },
  }
}
