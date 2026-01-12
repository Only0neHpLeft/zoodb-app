// Theme definitions with full CSS for TweakCN-style switching

export interface Theme {
  name: string
  value: string
  description: string
  preview: {
    light: { background: string; primary: string; accent: string }
    dark: { background: string; primary: string; accent: string }
  }
  css: string
}

export const themes: Theme[] = [
  {
    name: "Caffeine",
    value: "caffeine",
    description: "Warm coffee-inspired palette",
    preview: {
      light: { background: "#f9f9f9", primary: "#644a40", accent: "#ffdfb5" },
      dark: { background: "#111111", primary: "#ffe0c2", accent: "#393028" },
    },
    css: `
:root {
  --background: #f9f9f9;
  --foreground: #202020;
  --card: #fcfcfc;
  --card-foreground: #202020;
  --popover: #fcfcfc;
  --popover-foreground: #202020;
  --primary: #644a40;
  --primary-foreground: #ffffff;
  --secondary: #ffdfb5;
  --secondary-foreground: #582d1d;
  --muted: #efefef;
  --muted-foreground: #646464;
  --accent: #e8e8e8;
  --accent-foreground: #202020;
  --destructive: #e54d2e;
  --destructive-foreground: #ffffff;
  --border: #d8d8d8;
  --input: #d8d8d8;
  --ring: #644a40;
  --chart-1: #644a40;
  --chart-2: #ffdfb5;
  --chart-3: #e8e8e8;
  --chart-4: #ffe6c4;
  --chart-5: #66493e;
  --sidebar: #fbfbfb;
  --sidebar-foreground: #252525;
  --sidebar-primary: #343434;
  --sidebar-primary-foreground: #fbfbfb;
  --sidebar-accent: #f7f7f7;
  --sidebar-accent-foreground: #343434;
  --sidebar-border: #ebebeb;
  --sidebar-ring: #b5b5b5;
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --radius: 0.5rem;
  --shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
  --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}
.dark {
  --background: #111111;
  --foreground: #eeeeee;
  --card: #191919;
  --card-foreground: #eeeeee;
  --popover: #191919;
  --popover-foreground: #eeeeee;
  --primary: #ffe0c2;
  --primary-foreground: #081a1b;
  --secondary: #393028;
  --secondary-foreground: #ffe0c2;
  --muted: #222222;
  --muted-foreground: #b4b4b4;
  --accent: #2a2a2a;
  --accent-foreground: #eeeeee;
  --destructive: #e54d2e;
  --destructive-foreground: #ffffff;
  --border: #201e18;
  --input: #484848;
  --ring: #ffe0c2;
  --chart-1: #ffe0c2;
  --chart-2: #393028;
  --chart-3: #2a2a2a;
  --chart-4: #42382e;
  --chart-5: #ffe0c1;
  --sidebar: #18181b;
  --sidebar-foreground: #f4f4f5;
  --sidebar-primary: #1d4ed8;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #27272a;
  --sidebar-accent-foreground: #f4f4f5;
  --sidebar-border: #27272a;
  --sidebar-ring: #d4d4d8;
}`,
  },
  {
    name: "Darkmatter",
    value: "darkmatter",
    description: "Orange and teal dark theme",
    preview: {
      light: { background: "#ffffff", primary: "#d87943", accent: "#527575" },
      dark: { background: "#121113", primary: "#e78a53", accent: "#5f8787" },
    },
    css: `
:root {
  --background: #ffffff;
  --foreground: #111827;
  --card: #ffffff;
  --card-foreground: #111827;
  --popover: #ffffff;
  --popover-foreground: #111827;
  --primary: #d87943;
  --primary-foreground: #ffffff;
  --secondary: #527575;
  --secondary-foreground: #ffffff;
  --muted: #f3f4f6;
  --muted-foreground: #6b7280;
  --accent: #eeeeee;
  --accent-foreground: #111827;
  --destructive: #ef4444;
  --destructive-foreground: #fafafa;
  --border: #e5e7eb;
  --input: #e5e7eb;
  --ring: #d87943;
  --chart-1: #5f8787;
  --chart-2: #e78a53;
  --chart-3: #fbcb97;
  --chart-4: #888888;
  --chart-5: #999999;
  --sidebar: #f3f4f6;
  --sidebar-foreground: #111827;
  --sidebar-primary: #d87943;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #ffffff;
  --sidebar-accent-foreground: #111827;
  --sidebar-border: #e5e7eb;
  --sidebar-ring: #d87943;
  --font-sans: Geist Mono, ui-monospace, monospace;
  --font-serif: serif;
  --font-mono: JetBrains Mono, monospace;
  --radius: 0.75rem;
  --shadow-2xs: 0px 1px 4px 0px hsl(0 0% 0% / 0.03);
  --shadow-xs: 0px 1px 4px 0px hsl(0 0% 0% / 0.03);
  --shadow-sm: 0px 1px 4px 0px hsl(0 0% 0% / 0.05), 0px 1px 2px -1px hsl(0 0% 0% / 0.05);
  --shadow: 0px 1px 4px 0px hsl(0 0% 0% / 0.05), 0px 1px 2px -1px hsl(0 0% 0% / 0.05);
  --shadow-md: 0px 1px 4px 0px hsl(0 0% 0% / 0.05), 0px 2px 4px -1px hsl(0 0% 0% / 0.05);
  --shadow-lg: 0px 1px 4px 0px hsl(0 0% 0% / 0.05), 0px 4px 6px -1px hsl(0 0% 0% / 0.05);
  --shadow-xl: 0px 1px 4px 0px hsl(0 0% 0% / 0.05), 0px 8px 10px -1px hsl(0 0% 0% / 0.05);
  --shadow-2xl: 0px 1px 4px 0px hsl(0 0% 0% / 0.13);
  --tracking-normal: 0rem;
  --spacing: 0.25rem;
}
.dark {
  --background: #121113;
  --foreground: #c1c1c1;
  --card: #121212;
  --card-foreground: #c1c1c1;
  --popover: #121113;
  --popover-foreground: #c1c1c1;
  --primary: #e78a53;
  --primary-foreground: #121113;
  --secondary: #5f8787;
  --secondary-foreground: #121113;
  --muted: #222222;
  --muted-foreground: #888888;
  --accent: #333333;
  --accent-foreground: #c1c1c1;
  --destructive: #5f8787;
  --destructive-foreground: #121113;
  --border: #222222;
  --input: #222222;
  --ring: #e78a53;
  --chart-1: #5f8787;
  --chart-2: #e78a53;
  --chart-3: #fbcb97;
  --chart-4: #888888;
  --chart-5: #999999;
  --sidebar: #121212;
  --sidebar-foreground: #c1c1c1;
  --sidebar-primary: #e78a53;
  --sidebar-primary-foreground: #121113;
  --sidebar-accent: #333333;
  --sidebar-accent-foreground: #c1c1c1;
  --sidebar-border: #222222;
  --sidebar-ring: #e78a53;
}`,
  },
  {
    name: "Custom",
    value: "custom",
    description: "Your own custom theme",
    preview: {
      light: { background: "#ffffff", primary: "#000000", accent: "#cccccc" },
      dark: { background: "#000000", primary: "#ffffff", accent: "#333333" },
    },
    css: "", // Custom CSS is managed separately
  },
]

export type ThemeName = (typeof themes)[number]["value"]

// Get theme by value
export function getThemeByValue(value: string): Theme | undefined {
  return themes.find((t) => t.value === value)
}
