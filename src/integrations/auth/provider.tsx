import { ReactNode, Suspense, useCallback, useEffect } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexError } from "convex/values";
import { ConvexBetterAuthProvider, AuthBoundary } from "@convex-dev/better-auth/react";
import { useBetterAuthTauri } from "@daveyplate/better-auth-tauri/react";
import { authClient } from "@/lib/auth-client";
import { isTauri } from "@/lib/tauri";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

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

function isAuthError(error: unknown): boolean {
  if (error instanceof ConvexError) {
    const data = error.data;
    if (typeof data === "string") {
      return data === "Unauthenticated" || data.includes("auth");
    }
  }
  return false;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const handleUnauth = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore signOut errors
    }
    window.location.href = "/sign-in";
  }, []);

  return (
    <Suspense fallback={null}>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <TauriAuthSetup />
        <AuthBoundary
          authClient={authClient}
          getAuthUserFn={api.auth.getAuthUser}
          isAuthError={isAuthError}
          onUnauth={handleUnauth}
        >
          {children}
        </AuthBoundary>
      </ConvexBetterAuthProvider>
    </Suspense>
  );
}

export { convex };
