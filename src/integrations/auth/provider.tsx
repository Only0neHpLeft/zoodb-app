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
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background">
      {/* Animated logo/spinner */}
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin" />
      </div>

      {/* App name */}
      <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
        ZooDB
      </h1>

      {/* Tagline */}
      <p className="text-muted-foreground text-sm mb-6">{texts.tagline}</p>

      {/* Loading indicator */}
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <span>{texts.loading}</span>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
      </div>
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
