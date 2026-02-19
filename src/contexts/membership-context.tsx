import { createContext, useContext, ReactNode, useMemo } from "react"
import { useSession } from "@/lib/auth-client"
import {
  useMembership as useConvexMembership,
  useProfile as useConvexProfile,
  useGetOrCreateMembership,
  useUpdateMembership as useConvexUpdateMembership
} from "@/lib/db/convex-db"
import { useEffect } from "react"

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
  const { data: session, isPending } = useSession()
  const isUserLoaded = !isPending
  const isSignedIn = !!session?.user
  const userId = isSignedIn ? (session.user.id ?? undefined) : undefined

  // Reactive Convex queries - automatically update when data changes
  const convexMembership = useConvexMembership(userId)
  const convexProfile = useConvexProfile(userId)

  // Mutations
  const getOrCreateMembership = useGetOrCreateMembership()
  const updateMembershipMutation = useConvexUpdateMembership()

  // Ensure membership exists when user is signed in
  useEffect(() => {
    if (userId && convexMembership === null && isUserLoaded) {
      // Create membership if it doesn't exist
      getOrCreateMembership({ userId }).catch(console.error)
    }
  }, [userId, convexMembership, isUserLoaded, getOrCreateMembership])

  // Check if user is admin - admins get zooPlus by default
  const isAdmin = convexProfile?.isAdmin === true

  // Transform Convex data to legacy format with admin override
  const membership = useMemo<UserMembership | null>(() => {
    if (!convexMembership) return null

    return {
      id: convexMembership._id,
      user_id: convexMembership.userId,
      // Admin override: admins always get zooPlus
      plan_type: isAdmin ? "zooPlus" : (convexMembership.planType as PlanType),
      license_key: convexMembership.licenseKey || undefined,
      license_status: convexMembership.licenseStatus || undefined,
      license_expires_at: convexMembership.licenseExpiresAt
        ? new Date(convexMembership.licenseExpiresAt).toISOString()
        : undefined,
      created_at: new Date(convexMembership._creationTime).toISOString(),
      updated_at: new Date(convexMembership._creationTime).toISOString(),
    }
  }, [convexMembership, isAdmin])

  // Loading state: still waiting for user or membership data
  const loading = !isUserLoaded || (isSignedIn && convexMembership === undefined)

  const refreshMembership = async () => {
    // With reactive queries, this is a no-op - data auto-refreshes
    // But we can force a re-creation if needed
    if (userId) {
      await getOrCreateMembership({ userId })
    }
  }

  const updateMembership = async (
    planType: PlanType,
    licenseKey?: string,
    licenseStatus?: string,
    expiresAt?: string
  ) => {
    if (!userId) return

    await updateMembershipMutation({
      userId,
      planType,
      licenseKey,
      licenseStatus,
      licenseExpiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
    })
  }

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

const defaultMembershipContext: MembershipContextType = {
  membership: null,
  loading: true,
  refreshMembership: async () => {},
  updateMembership: async () => {},
}

export function useMembership() {
  const context = useContext(MembershipContext)
  return context ?? defaultMembershipContext
}
