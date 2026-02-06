declare const __APP_VERSION__: string;

import { Loader } from 'lucide-react';

// Loading screen translations
const loadingTexts = {
  en: {
    tagline: "SQL Learning Environment",
    loading: "Loading",
  },
  cz: {
    tagline: "Prostředí pro výuku SQL",
    loading: "Načítání",
  },
};

function getStoredLanguage(): "en" | "cz" {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("language");
    if (stored === "cz") return "cz";
  }
  return "en";
}

export function LoadingScreen() {
  const lang = getStoredLanguage();
  const texts = loadingTexts[lang];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-background overflow-hidden">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 animate-pulse [animation-duration:4s]" />

      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 animate-[fadeIn_1s_ease-out_0.3s_forwards]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary) / 0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Logo */}
      <div className="relative mb-8 opacity-0 animate-[fadeIn_0.6s_ease-out_0.1s_forwards]">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
          <Loader className="h-8 w-8 text-primary-foreground animate-spin [animation-duration:2s]" />
        </div>
      </div>

      {/* App name */}
      <h1 className="text-3xl font-bold text-foreground mb-1.5 tracking-tight opacity-0 animate-[slideUp_0.5s_ease-out_0.2s_forwards]">
        ZooDB
      </h1>

      {/* Tagline */}
      <p className="text-muted-foreground text-sm mb-8 opacity-0 animate-[slideUp_0.5s_ease-out_0.35s_forwards]">
        {texts.tagline}
      </p>

      {/* Loading bar */}
      <div className="w-48 opacity-0 animate-[slideUp_0.5s_ease-out_0.5s_forwards]">
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full w-full rounded-full bg-primary/60 origin-left animate-[shimmer_1.5s_ease-in-out_infinite]" />
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-4 text-muted-foreground/60 text-xs">
          <span>{texts.loading}</span>
          <span className="inline-block w-1 h-1 rounded-full bg-primary/50 animate-bounce [animation-delay:-0.3s]" />
          <span className="inline-block w-1 h-1 rounded-full bg-primary/50 animate-bounce [animation-delay:-0.15s]" />
          <span className="inline-block w-1 h-1 rounded-full bg-primary/50 animate-bounce" />
        </div>
      </div>

      {/* Version */}
      <p className="absolute bottom-6 text-[10px] text-muted-foreground/30 opacity-0 animate-[fadeIn_0.5s_ease-out_0.8s_forwards]">
        v{__APP_VERSION__}
      </p>
    </div>
  );
}
