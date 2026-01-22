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
    name: "Mono",
    value: "mono",
    description: "Clean monochrome design",
    preview: {
      light: {
        background: "#ffffff",
        primary: "#737373",
        accent: "#f5f5f5",
      },
      dark: {
        background: "#0a0a0a",
        primary: "#737373",
        accent: "#262626",
      },
    },
  },
  {
    name: "Violet Bloom",
    value: "violet-bloom",
    description: "Vibrant purple accents",
    preview: {
      light: {
        background: "#fdfdfd",
        primary: "#7033ff",
        accent: "#e2ebff",
      },
      dark: {
        background: "#1a1b1e",
        primary: "#8c5cff",
        accent: "#1e293b",
      },
    },
  },
  {
    name: "Supabase",
    value: "supabase",
    description: "Fresh green developer theme",
    preview: {
      light: {
        background: "#fcfcfc",
        primary: "#72e3ad",
        accent: "#ededed",
      },
      dark: {
        background: "#121212",
        primary: "#006239",
        accent: "#313131",
      },
    },
  },
  {
    name: "Sage Garden",
    value: "sage-garden",
    description: "Natural earthy tones",
    preview: {
      light: {
        background: "#f8f7f4",
        primary: "#7c9082",
        accent: "#bfc9bb",
      },
      dark: {
        background: "#0a0a0a",
        primary: "#7c9082",
        accent: "#36443a",
      },
    },
  },
  {
    name: "Claude",
    value: "claude",
    description: "Warm terracotta style",
    preview: {
      light: {
        background: "#faf9f5",
        primary: "#c96442",
        accent: "#e9e6dc",
      },
      dark: {
        background: "#262624",
        primary: "#d97757",
        accent: "#1a1915",
      },
    },
  },
] as const

export type ThemeName = (typeof themes)[number]["value"]
