export interface ParsedTheme {
    light: Record<string, string>;
    dark: Record<string, string>;
}

export function parseThemeCss(css: string): ParsedTheme {
    const theme: ParsedTheme = {
        light: {},
        dark: {},
    };

    // Remove comments to avoid parsing issues
    const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, '');

    // Helper to extract variables from a block
    const extractVariables = (blockContent: string): Record<string, string> => {
        const vars: Record<string, string> = {};
        const lines = blockContent.split(';');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('--')) {
                const [key, ...valueParts] = trimmed.split(':');
                if (key && valueParts.length > 0) {
                    vars[key.trim()] = valueParts.join(':').trim();
                }
            }
        }
        return vars;
    };

    // Extract :root block (light mode)
    const rootMatch = cleanCss.match(/:root\s*{([^}]*)}/);
    if (rootMatch && rootMatch[1]) {
        theme.light = extractVariables(rootMatch[1]);
    }

    // Extract .dark block (dark mode)
    const darkMatch = cleanCss.match(/\.dark\s*{([^}]*)}/);
    if (darkMatch && darkMatch[1]) {
        theme.dark = extractVariables(darkMatch[1]);
    }

    return theme;
}
