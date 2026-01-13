import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useUser } from "@clerk/clerk-react"
import { getMembership, updateMembership as updateMembershipApi, getProfile } from "@/lib/db/tauri-db"

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

export function MembershipProvider({ children }: { children: ReactNode }) {
  const [membership, setMembership] = useState<UserMembership | null>(null)
  const [loading, setLoading] = useState(true)
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser()

  const fetchMembership = async (userId: string, retryCount = 0) => {
    try {
      // First, check if profile exists (required for foreign key)
      const { data: profile } = await getProfile(userId)
      if (!profile) {
        // Profile doesn't exist yet - wait and retry (useClerkAuth creates it)
        if (retryCount < 5) {
          setTimeout(() => fetchMembership(userId, retryCount + 1), 500)
          return
        }
        // After retries, just set fallback
        setMembership({
          id: "",
          user_id: userId,
          plan_type: "free",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        setLoading(false)
        return
      }

      // Get membership via Tauri command (it will create free one if doesn't exist)
      const { data, error } = await getMembership(userId)

      if (error) {
        // Set free plan as fallback
        setMembership({
          id: "",
          user_id: userId,
          plan_type: "free",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } else if (data) {
        setMembership({
          id: String(data.id),
          user_id: data.user_id,
          plan_type: data.plan_type as PlanType,
          license_key: data.license_key || undefined,
          license_status: data.license_status || undefined,
          license_expires_at: data.license_expires_at || undefined,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        })
      }
    } catch {
      // Set free plan as fallback
      setMembership({
        id: "",
        user_id: userId,
        plan_type: "free",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshMembership = async () => {
    if (user) {
      setLoading(true)
      await fetchMembership(user.id)
    }
  }

  const updateMembership = async (
    planType: PlanType,
    licenseKey?: string,
    licenseStatus?: string,
    expiresAt?: string
  ) => {
    if (!user) return

    try {
      const { data, error } = await updateMembershipApi(
        user.id,
        planType,
        licenseKey,
        licenseStatus,
        expiresAt
      )

      if (error) {
        throw error
      }

      if (data) {
        setMembership({
          id: String(data.id),
          user_id: data.user_id,
          plan_type: data.plan_type as PlanType,
          license_key: data.license_key || undefined,
          license_status: data.license_status || undefined,
          license_expires_at: data.license_expires_at || undefined,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        })
      }
    } catch (error) {
      throw error
    }
  }

  useEffect(() => {
    let isSubscribed = true

    // Safety timeout: ensure loading state doesn't stay true forever
    const loadingTimeout = setTimeout(() => {
      if (isSubscribed) {
        setLoading(false)
      }
    }, 5000) // 5 second timeout

    if (isUserLoaded) {
      if (isSignedIn && user) {
        fetchMembership(user.id)
      } else {
        setMembership(null)
        setLoading(false)
      }
    }

    return () => {
      isSubscribed = false
      clearTimeout(loadingTimeout)
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
