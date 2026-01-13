export const themes = [
  {
    name: "Eyesight",
    value: "eyesight",
    description: "Soft purple tones for comfortable viewing",
    preview: {
      light: {
        background: "#f8f7fa",
        primary: "#8a79ab",
        accent: "#e6a5b8",
      },
      dark: {
        background: "#1a1823",
        primary: "#a995c9",
        accent: "#f2b8c6",
      },
    },
  },
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
    name: "Claymorphism",
    value: "claymorphism",
    description: "Soft clay-like textures and shadows",
    preview: {
      light: {
        background: "#e7e5e4",
        primary: "#6366f1",
        accent: "#f3e5f5",
      },
      dark: {
        background: "#1e1b18",
        primary: "#818cf8",
        accent: "#484441",
      },
    },
  },
  {
    name: "Mono",
    value: "mono",
    description: "Minimalist monochrome design",
    preview: {
      light: {
        background: "#ffffff",
        primary: "#737373",
        accent: "#f5f5f5",
      },
      dark: {
        background: "#0a0a0a",
        primary: "#737373",
        accent: "#404040",
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