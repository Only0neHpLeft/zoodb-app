export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              // Load selected theme (default: caffeine)
              const theme = localStorage.getItem('selected-theme') || 'caffeine';
              document.documentElement.setAttribute('data-theme', theme);

              // Load dark mode preference (default: dark)
              const darkMode = localStorage.getItem('theme');
              if (darkMode === 'light') {
                document.documentElement.classList.remove('dark');
              } else {
                // Default to dark mode
                document.documentElement.classList.add('dark');
              }
            } catch (e) {}
          })();
        `,
      }}
    />
  )
}