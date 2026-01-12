import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useUser } from "@clerk/clerk-react"

export type PlanType = "free" | "zoo" | "zooPlus"

export interface UserMembership {
  id: string
  user_id: string
  plan_type: PlanType
  license_key?: string
  license_status?: string
  license_expires_at?: string
  created_at: string
  updated_at: string
}

interface MembershipContextType {
  membership: UserMembership | null
  loading: boolean
  refreshMembership: () => Promise<void>
  updateMembership: (planType: PlanType, licenseKey?: string, licenseStatus?: string, expiresAt?: string) => Promise<void>
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined)

// localStorage key for membership
const MEMBERSHIP_KEY = "user_membership"

interface StoredMembership {
  userId: string
  planType: PlanType
  licenseKey?: string
  licenseStatus?: string
  expiresAt?: string
}

export function MembershipProvider({ children }: { children: ReactNode }) {
  const [membership, setMembership] = useState<UserMembership | null>(null)
  const [loading, setLoading] = useState(true)
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser()

  // Get stored membership from localStorage
  const getStoredMembership = (userId: string): StoredMembership | null => {
    if (typeof window === "undefined") return null

    try {
      const stored = localStorage.getItem(MEMBERSHIP_KEY)
      if (!stored) return null

      const data: StoredMembership = JSON.parse(stored)
      if (data.userId === userId) {
        return data
      }
      return null
    } catch {
      return null
    }
  }

  // Save membership to localStorage
  const saveMembership = (data: StoredMembership): void => {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(data))
    } catch {
      // Ignore storage errors
    }
  }

  const loadMembership = (userId: string) => {
    const stored = getStoredMembership(userId)
    const now = new Date().toISOString()

    const membershipData: UserMembership = {
      id: stored ? "local" : "",
      user_id: userId,
      plan_type: stored?.planType || "free",
      license_key: stored?.licenseKey,
      license_status: stored?.licenseStatus,
      license_expires_at: stored?.expiresAt,
      created_at: now,
      updated_at: now,
    }

    // Save if not already stored
    if (!stored) {
      saveMembership({
        userId,
        planType: "free",
      })
    }

    setMembership(membershipData)
    setLoading(false)
  }

  const refreshMembership = async () => {
    if (user) {
      loadMembership(user.id)
    }
  }

  const updateMembership = async (
    planType: PlanType,
    licenseKey?: string,
    licenseStatus?: string,
    expiresAt?: string
  ) => {
    if (!user) return

    const now = new Date().toISOString()

    // Save to localStorage
    saveMembership({
      userId: user.id,
      planType,
      licenseKey,
      licenseStatus,
      expiresAt,
    })

    // Update state
    setMembership({
      id: "local",
      user_id: user.id,
      plan_type: planType,
      license_key: licenseKey,
      license_status: licenseStatus,
      license_expires_at: expiresAt,
      created_at: now,
      updated_at: now,
    })
  }

  useEffect(() => {
    if (isUserLoaded) {
      if (isSignedIn && user) {
        loadMembership(user.id)
      } else {
        setMembership(null)
        setLoading(false)
      }
    }
  }, [isUserLoaded, isSignedIn, user?.id])

  return (
    <MembershipContext.Provider
      value={{
        membership,
        loading,
        refreshMembership,
        updateMembership,
      }}
    >
      {children}
    </MembershipContext.Provider>
  )
}

export function useMembership() {
  const context = useContext(MembershipContext)
  if (context === undefined) {
    throw new Error("useMembership must be used within a MembershipProvider")
  }
  return context
}
