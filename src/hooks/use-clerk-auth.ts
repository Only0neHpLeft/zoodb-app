// hooks/useClerkAuth.ts

import { useUser, useClerk, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { getProfile, upsertProfile } from "@/lib/db/convex-db";

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: "student" | "teacher" | "admin";
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Cache key for localStorage
const PROFILE_CACHE_KEY = "auth_profile_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface ProfileCache {
  profile: UserProfile;
  timestamp: number;
  userId: string;
}

export function useAuth() {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useClerkAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileFetchedRef = useRef<Set<string>>(new Set());

  // Get cached profile from localStorage
  const getCachedProfile = (userId: string): UserProfile | null => {
    if (typeof window === "undefined") return null;

    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (!cached) return null;

      const cacheData: ProfileCache = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is valid (same user and not expired)
      if (
        cacheData.userId === userId &&
        now - cacheData.timestamp < CACHE_DURATION
      ) {
        return cacheData.profile;
      }

      // Cache expired or different user
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    } catch {
      return null;
    }
  };

  // Save profile to localStorage cache
  const setCachedProfile = (userId: string, profile: UserProfile): void => {
    if (typeof window === "undefined") return;

    try {
      const cacheData: ProfileCache = {
        profile,
        timestamp: Date.now(),
        userId,
      };
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheData));
    } catch {
      // Ignore cache write errors
    }
  };

  const fetchProfile = async (
    userId: string,
    forceRefetch = false
  ): Promise<void> => {
    try {
      // Prevent duplicate fetches for the same user in the same session
      if (!forceRefetch && profileFetchedRef.current.has(userId)) {
        return;
      }

      // Try to get from cache first
      if (!forceRefetch) {
        const cached = getCachedProfile(userId);
        if (cached) {
          setProfile(cached);
          profileFetchedRef.current.add(userId);
          return;
        }
      }

      const { data, error } = await getProfile(userId);

      if (error) {
        setProfile(null);
        return;
      }

      if (data) {
        setProfile(data);
        setCachedProfile(userId, data);
        profileFetchedRef.current.add(userId);
      } else {
        // No profile exists - create one

        if (user) {
          const { data: newProfile, error: createError } = await upsertProfile(
            userId,
            user.emailAddresses[0]?.emailAddress || "",
            user.fullName || undefined,
            "student"
          );

          if (createError) {
            // Set a minimal fallback profile
            const fallbackProfile: UserProfile = {
              id: userId,
              email: user.emailAddresses[0]?.emailAddress || "",
              role: "student",
              is_admin: false,
            };
            setProfile(fallbackProfile);
          } else if (newProfile) {
            setProfile(newProfile);
            setCachedProfile(userId, newProfile);
            profileFetchedRef.current.add(userId);
          }
        }
      }
    } catch {
      setProfile(null);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut();
    } catch {
      // Ignore logout errors
    } finally {
      // Clear local state
      if (typeof window !== "undefined") {
        localStorage.removeItem(PROFILE_CACHE_KEY);
      }
      profileFetchedRef.current.clear();
      setProfile(null);
      navigate({ to: "/sign-in" as any });
    }
  };

  // Load profile when user is available
  useEffect(() => {
    if (isUserLoaded) {
      if (isSignedIn && user) {
        fetchProfile(user.id);
      } else {
        setProfile(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem(PROFILE_CACHE_KEY);
        }
        profileFetchedRef.current.clear();
      }
      setLoading(false);
    }
  }, [isUserLoaded, isSignedIn, user?.id]);

  return {
    // Clerk user state
    user,
    isSignedIn,
    isLoaded: isUserLoaded,

    // Profile from NeonDB
    profile,
    loading,

    // Actions
    logout,
    refreshProfile: (forceRefetch = false) =>
      user ? fetchProfile(user.id, forceRefetch) : Promise.resolve(),

    // Token for API calls if needed
    getToken,
  };
}
