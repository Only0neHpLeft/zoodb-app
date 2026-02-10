import { useEffect, useRef, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
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
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  const user = session?.user ?? null;
  const isSignedIn = !!user;
  const isLoaded = !isPending;

  const userId = user?.id ?? undefined;

  // Reactive Convex query — returns undefined while loading, null if not found, or data
  const convexProfile = useProfile(userId);
  const upsertProfile = useUpsertProfile();

  // Track whether we've already triggered a profile creation to avoid duplicates
  const creatingRef = useRef(false);

  // Auto-create profile if user is signed in but no profile exists
  useEffect(() => {
    if (
      userId &&
      user &&
      convexProfile === null &&
      !creatingRef.current
    ) {
      creatingRef.current = true;
      upsertProfile({
        userId,
        email: user.email || "",
        fullName: user.name || undefined,
        role: "student",
      }).finally(() => {
        creatingRef.current = false;
      });
    }
  }, [userId, user, convexProfile, upsertProfile]);

  // Transform Convex profile to legacy shape consumed by app-sidebar, settings, etc.
  const profile = useMemo<UserProfile | null>(() => {
    if (!convexProfile) return null;

    return {
      id: convexProfile.userId,
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
  const loading = !isLoaded || (isSignedIn && convexProfile === undefined);

  const logout = async (): Promise<void> => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sign-out failed:", error);
    }

    // Soft navigate — AuthGuard renders auth routes immediately and
    // ProtectedProviders unmounts the Convex/offline stack, so all
    // subscriptions clean up without a full-page-reload flicker.
    navigate({ to: "/sign-in" });
  };

  return {
    // User state
    user,
    isSignedIn,
    isLoaded,

    // Profile from Convex (reactive)
    profile,
    loading,

    // Actions
    logout,
    refreshProfile: () => Promise.resolve(), // no-op — Convex subscriptions handle freshness
  };
}
