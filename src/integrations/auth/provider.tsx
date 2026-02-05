import { ReactNode, Suspense } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client";

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

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        {children}
      </ConvexBetterAuthProvider>
    </Suspense>
  );
}

export { convex };
