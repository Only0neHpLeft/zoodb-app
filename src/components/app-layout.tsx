import { useNavigate, useLocation } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { WifiOff } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { authClient } from "@/lib/auth-client"
import { useOffline } from "@/contexts/offline-context"
import { useLanguage } from "@/contexts/language-context"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { LoadingScreen } from "@/components/loading-screen"

// Routes that don't require authentication and shouldn't show sidebar
const authRoutes = ["/sign-in", "/sign-up", "/verify-email"]

// Timeout for detecting stale auth state (5 seconds)
const AUTH_TIMEOUT_MS = 5000

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isAuthRoute = authRoutes.some(route => pathname?.startsWith(route))

  // Clear stale sessions if auth takes too long to load
  useEffect(() => {
    if (!isLoaded && !isAuthRoute) {
      timeoutRef.current = setTimeout(async () => {
        console.warn("Auth timeout - clearing stale session")
        try {
          await authClient.signOut()
        } catch {
          // Ignore signOut errors, just redirect
        }
        navigate({ to: "/sign-in" as never })
      }, AUTH_TIMEOUT_MS)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isLoaded, isAuthRoute, navigate])

  useEffect(() => {
    if (!isLoaded) return

    // Clear any pending timeout since auth loaded
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // If not signed in and trying to access a protected route, redirect to sign-in
    if (!isSignedIn && !isAuthRoute) {
      navigate({ to: "/sign-in" as never })
    }

    // If signed in and on an auth route (sign-in/sign-up), full reload to home.
    // Client-side navigate causes stale PGlite IDB locks from the pre-login session.
    if (isSignedIn && isAuthRoute) {
      window.location.href = "/"
    }
  }, [isLoaded, isSignedIn, isAuthRoute, navigate, pathname])

  // For auth routes (sign-in, sign-up), render children directly (centered layout)
  if (isAuthRoute) {
    return <>{children}</>
  }

  // Show loading screen while auth is loading or user not signed in
  if (!isLoaded || !isSignedIn) {
    return <LoadingScreen />
  }

  // Render with sidebar for authenticated users (SidebarProvider is in __root.tsx)
  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex-1">
        <OfflineBanner />
        {children}
      </SidebarInset>
    </>
  )
}

function OfflineBanner() {
  const { isOnline } = useOffline()
  const { language } = useLanguage()

  if (isOnline) return null

  return (
    <div className="flex items-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        {language === "cz"
          ? "Jste offline. Zm\u011bny se synchronizuj\u00ed po op\u011btovn\u00e9m p\u0159ipojen\u00ed."
          : "You are offline. Changes will sync when you reconnect."}
      </span>
    </div>
  )
}
