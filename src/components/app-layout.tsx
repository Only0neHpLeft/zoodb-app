import { useUser, useClerk } from "@clerk/clerk-react"
import { useNavigate, useLocation } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"

// Routes that don't require authentication and shouldn't show sidebar
const authRoutes = ["/sign-in", "/sign-up"]

// Timeout for detecting stale auth state (5 seconds)
const AUTH_TIMEOUT_MS = 5000

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
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
          await signOut()
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
  }, [isLoaded, isAuthRoute, signOut, navigate])

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

    // If signed in and on an auth route (sign-in/sign-up), redirect to home
    if (isSignedIn && isAuthRoute) {
      navigate({ to: "/" })
    }
  }, [isLoaded, isSignedIn, isAuthRoute, navigate, pathname])

  // For auth routes (sign-in, sign-up), render children directly (centered layout)
  if (isAuthRoute) {
    return <>{children}</>
  }

  // Show loading spinner while auth is loading or user not signed in
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  // Render with sidebar for authenticated users
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex-1">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
