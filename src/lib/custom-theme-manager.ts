import { ParsedTheme, parseThemeCss } from './theme-parser';

const STORAGE_KEY = 'custom-theme-css';

export function saveCustomTheme(css: string): ParsedTheme {
    const parsed = parseThemeCss(css);
    // Save the raw CSS to localStorage so we can re-populate the textarea if needed
    // and also to re-parse it on load.
    // Ideally we might want to save the parsed object to avoid re-parsing, 
    // but saving the raw CSS allows the user to edit their "source" later if we add that feature.
    localStorage.setItem(STORAGE_KEY, css);
    return parsed;
}

export function getCustomTheme(): ParsedTheme | null {
    if (typeof window === 'undefined') return null;
    const css = localStorage.getItem(STORAGE_KEY);
    if (!css) return null;
    return parseThemeCss(css);
}

export function getCustomThemeRaw(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY) || '';
}

export function generateCustomThemeCss(theme: ParsedTheme): string {
    const lightVars = Object.entries(theme.light)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n  ');

    const darkVars = Object.entries(theme.dark)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n  ');

    return `
    [data-theme="custom"] {
      ${lightVars}
    }
    
    [data-theme="custom"].dark {
      ${darkVars}
    }
  `;
}
