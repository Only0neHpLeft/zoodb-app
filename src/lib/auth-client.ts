import { createAuthClient } from "better-auth/react";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri } from "@/lib/tauri";

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string;

export const authClient = createAuthClient({
  baseURL: CONVEX_SITE_URL,
  plugins: [convexClient(), crossDomainClient(), emailOTPClient()],
  fetchOptions: {
    // In Tauri, use the native HTTP plugin for cookie support on macOS WebKit
    ...(isTauri() && {
      customFetchImpl: tauriFetch as unknown as typeof globalThis.fetch,
    }),
  },
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
