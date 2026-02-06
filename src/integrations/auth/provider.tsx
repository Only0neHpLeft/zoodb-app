declare const __APP_VERSION__: string;

import { ReactNode, Suspense, useCallback, useEffect } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { useBetterAuthTauri } from "@daveyplate/better-auth-tauri/react";
import { authClient } from "@/lib/auth-client";
import { isTauri } from "@/lib/tauri";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

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

function LoadingScreen() {
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

      {/* Logo with animated rings */}
      <div className="relative mb-8 opacity-0 animate-[fadeIn_0.6s_ease-out_0.1s_forwards]">
        {/* Outer pulse ring */}
        <div className="absolute -inset-4 rounded-full border border-primary/10 animate-[ping_3s_ease-in-out_infinite]" />
        {/* Middle ring */}
        <div className="absolute -inset-2 rounded-full border border-primary/20 animate-pulse [animation-duration:2s]" />
        {/* Icon container */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
          <svg className="h-8 w-8 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6 2 10c0 2.5 1.5 4.5 3.5 6C4 18 3 20 3 22h18c0-2-1-4-2.5-6C20.5 14.5 22 12.5 22 10c0-4-4.48-8-10-8z" />
            <circle cx="9" cy="10" r="1.5" fill="currentColor" />
            <circle cx="15" cy="10" r="1.5" fill="currentColor" />
          </svg>
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

interface AuthProviderProps {
  children: ReactNode;
}

function TauriAuthSetup() {
  const onSuccess = useCallback((callbackURL?: string | null) => {
    window.location.href = callbackURL || "/";
  }, []);

  useBetterAuthTauri({
    authClient,
    scheme: "zoodb",
    onSuccess,
  });

  // Fallback deep link handler for OAuth redirects (zoodb:///?ott=xxx)
  // useBetterAuthTauri only handles zoodb://api/auth/... URLs
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    const setup = async () => {
      const { onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
      unlisten = await onOpenUrl((urls) => {
        for (const url of urls) {
          if (url.startsWith("zoodb://") && !url.includes("/api/auth/")) {
            try {
              const parsed = new URL(url);
              const ott = parsed.searchParams.get("ott");
              if (ott) {
                // Navigate with OTT so crossDomainClient exchanges it
                window.location.href = `/?ott=${ott}`;
                return;
              }
            } catch { /* invalid URL, fall through */ }
            window.location.href = "/";
          }
        }
      });
    };

    setup();
    return () => unlisten?.();
  }, []);

  return null;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <TauriAuthSetup />
        {children}
      </ConvexBetterAuthProvider>
    </Suspense>
  );
}

export { convex };
