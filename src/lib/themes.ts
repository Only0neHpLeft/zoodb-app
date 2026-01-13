export const themes = [
  {
    name: "Caffeine",
    value: "caffeine",
    description: "Warm coffee-inspired palette",
    preview: {
      light: {
        background: "#f9f9f9",
        primary: "#644a40",
        accent: "#ffdfb5",
      },
      dark: {
        background: "#111111",
        primary: "#ffe0c2",
        accent: "#393028",
      },
    },
  },
  {
    name: "Custom",
    value: "custom",
    description: "Your own custom theme",
    preview: {
      light: {
        background: "#ffffff",
        primary: "#000000",
        accent: "#cccccc",
      },
      dark: {
        background: "#000000",
        primary: "#ffffff",
        accent: "#333333",
      },
    },
  },
] as const

export type ThemeName = (typeof themes)[number]["value"]
