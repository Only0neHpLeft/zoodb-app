import { useNavigate, useLocation } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { authClient } from "@/lib/auth-client"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { LoadingScreen } from "@/components/loading-screen"

// Routes that don't require authentication and shouldn't show sidebar
const authRoutes = ["/sign-in", "/sign-up"]

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
        {children}
      </SidebarInset>
    </>
  )
}
