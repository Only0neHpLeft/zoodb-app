// hooks/useClerkAuth.ts
// Frontend-only auth hook using Clerk user data directly

import { useUser, useClerk, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: "student" | "teacher" | "admin";
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Cache key for localStorage (for role/admin settings)
const PROFILE_SETTINGS_KEY = "user_profile_settings";

interface ProfileSettings {
  userId: string;
  role: "student" | "teacher" | "admin";
  is_admin: boolean;
}

export function useAuth() {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useClerkAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Get stored profile settings from localStorage
  const getProfileSettings = (userId: string): ProfileSettings | null => {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(PROFILE_SETTINGS_KEY);
      if (!stored) return null;

      const settings: ProfileSettings = JSON.parse(stored);
      if (settings.userId === userId) {
        return settings;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Save profile settings to localStorage
  const saveProfileSettings = (settings: ProfileSettings): void => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  };

  // Build profile from Clerk user data
  const buildProfile = (): void => {
    if (!user) {
      setProfile(null);
      return;
    }

    // Get stored settings (role, is_admin) or use defaults
    const settings = getProfileSettings(user.id);

    const userProfile: UserProfile = {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || "",
      full_name: user.fullName || user.firstName || undefined,
      role: settings?.role || "student",
      is_admin: settings?.is_admin || false,
      created_at: user.createdAt?.toISOString(),
      updated_at: user.updatedAt?.toISOString(),
    };

    // Save settings if not already stored
    if (!settings) {
      saveProfileSettings({
        userId: user.id,
        role: "student",
        is_admin: false,
      });
    }

    setProfile(userProfile);
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local state
      if (typeof window !== "undefined") {
        localStorage.removeItem(PROFILE_SETTINGS_KEY);
      }
      setProfile(null);
      navigate({ to: "/sign-in" as any });
    }
  };

  // Update profile role (for admin panel use)
  const updateRole = (role: "student" | "teacher" | "admin", isAdmin: boolean = false): void => {
    if (!user) return;

    saveProfileSettings({
      userId: user.id,
      role,
      is_admin: isAdmin,
    });

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            role,
            is_admin: isAdmin,
          }
        : null
    );
  };

  // Build profile when user is available
  useEffect(() => {
    if (isUserLoaded) {
      if (isSignedIn && user) {
        buildProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    }
  }, [isUserLoaded, isSignedIn, user?.id, user?.fullName, user?.primaryEmailAddress]);

  return {
    // Clerk user state
    user,
    isSignedIn,
    isLoaded: isUserLoaded,

    // Profile built from Clerk data
    profile,
    loading,

    // Actions
    logout,
    updateRole,
    refreshProfile: () => buildProfile(),

    // Token for API calls if needed
    getToken,
  };
}
