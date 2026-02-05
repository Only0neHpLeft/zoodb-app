// hooks/useClerkAuth.ts

import { useUser, useClerk, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useMemo } from "react";
import { useProfile, useUpsertProfile } from "@/lib/db/convex-db";

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: "student" | "teacher" | "admin";
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useAuth() {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useClerkAuth();

  const clerkId = isSignedIn && user ? user.id : undefined;

  // Reactive Convex query — returns undefined while loading, null if not found, or data
  const convexProfile = useProfile(clerkId);
  const upsertProfile = useUpsertProfile();

  // Track whether we've already triggered a profile creation to avoid duplicates
  const creatingRef = useRef(false);

  // Auto-create profile if user is signed in but no profile exists
  useEffect(() => {
    if (
      clerkId &&
      user &&
      convexProfile === null &&
      !creatingRef.current
    ) {
      creatingRef.current = true;
      upsertProfile({
        clerkId,
        email: user.emailAddresses[0]?.emailAddress || "",
        fullName: user.fullName || undefined,
        role: "student",
      }).finally(() => {
        creatingRef.current = false;
      });
    }
  }, [clerkId, user, convexProfile, upsertProfile]);

  // Transform Convex profile to legacy shape consumed by app-sidebar, settings, etc.
  const profile = useMemo<UserProfile | null>(() => {
    if (!convexProfile) return null;

    return {
      id: convexProfile.clerkId,
      email: convexProfile.email,
      full_name: convexProfile.fullName,
      role: convexProfile.role as "student" | "teacher" | "admin" | undefined,
      is_admin: convexProfile.isAdmin,
      created_at: convexProfile._creationTime
        ? new Date(convexProfile._creationTime).toISOString()
        : undefined,
      updated_at: convexProfile._creationTime
        ? new Date(convexProfile._creationTime).toISOString()
        : undefined,
    };
  }, [convexProfile]);

  // Loading: user not loaded yet, or signed in but profile still loading (undefined)
  const loading = !isUserLoaded || (isSignedIn && convexProfile === undefined);

  const logout = async (): Promise<void> => {
    try {
      await Promise.race([
        signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("signOut timed out")), 5000)
        ),
      ]);
    } catch (error) {
      console.error("Sign-out failed:", error);
    }

    // Clear the JWT stored in the Rust plugin
    try {
      await invoke("plugin:clerk|set_client_authorization_header", {
        header: "",
      });
    } catch {
      // Plugin may not support empty header; ignore
    }

    // Clear all Clerk + app auth keys from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("__clerk")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Full reload to /sign-in so initClerk() starts fresh
    window.location.href = "/sign-in";
  };

  return {
    // Clerk user state
    user,
    isSignedIn,
    isLoaded: isUserLoaded,

    // Profile from Convex (reactive)
    profile,
    loading,

    // Actions
    logout,
    refreshProfile: () => Promise.resolve(), // no-op — Convex subscriptions handle freshness

    // Token for API calls if needed
    getToken,
  };
}
