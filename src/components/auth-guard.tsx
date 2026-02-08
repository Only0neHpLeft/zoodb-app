import { useEffect, useRef } from "react"
import { useNavigate, useLocation } from "@tanstack/react-router"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { show as showApp } from "@tauri-apps/api/app"
import { authClient, useSession } from "@/lib/auth-client"

const AUTH_ROUTES = ["/sign-in", "/sign-up", "/verify-email"]
const AUTH_TIMEOUT_MS = 5000

/**
 * AuthGuard — single source of truth for auth redirects and window visibility.
 *
 * Uses useSession() directly (Better Auth, client-side) so it works WITHOUT
 * the Convex provider stack. This means it's never blocked by Convex Suspense.
 *
 * Rules:
 *  - Auth routes always render immediately (no providers needed).
 *  - Protected routes render only after session check confirms access.
 *  - Window stays hidden until the destination screen is stable.
 *  - If session never resolves, safety timeout redirects to sign-in.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const shownRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLoaded = !isPending
  const isSignedIn = !!session?.user
  const isAuthRoute = AUTH_ROUTES.some(r => pathname?.startsWith(r))
  const isEmailVerified = session?.user?.emailVerified ?? false

  // Safety: if session never resolves on a protected route, clear stale session and redirect
  useEffect(() => {
    if (!isLoaded && !isAuthRoute) {
      timeoutRef.current = setTimeout(async () => {
        console.warn("Auth timeout — redirecting to sign-in")
        try { await authClient.signOut() } catch {}
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

  // All auth redirects (single source of truth)
  useEffect(() => {
    if (!isLoaded) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Not signed in on protected route → sign-in
    if (!isSignedIn && !isAuthRoute) {
      navigate({ to: "/sign-in" as never })
      return
    }

    // Signed in on sign-in/sign-up → home
    if (isSignedIn && isAuthRoute && !pathname?.startsWith("/verify-email")) {
      navigate({ to: "/" as never })
      return
    }

    // Signed in, unverified email, on protected route → verify-email
    if (isSignedIn && !isEmailVerified && !isAuthRoute) {
      navigate({
        to: "/verify-email" as never,
        search: { email: session?.user?.email } as never,
      })
    }
  }, [isLoaded, isSignedIn, isAuthRoute, isEmailVerified, navigate, pathname, session?.user?.email])

  // Window visibility — show only when stable (no redirect pending)
  useEffect(() => {
    if (shownRef.current) return

    if (isLoaded) {
      const willRedirect =
        (!isSignedIn && !isAuthRoute) ||
        (isSignedIn && isAuthRoute && !pathname?.startsWith("/verify-email")) ||
        (isSignedIn && !isEmailVerified && !isAuthRoute)
      if (willRedirect) return
    }

    if (isAuthRoute || isLoaded) {
      shownRef.current = true
      const win = getCurrentWindow()
      showApp().then(() => win.show()).then(() => win.setFocus()).catch(() => {})
    }
  }, [isAuthRoute, isLoaded, isSignedIn, isEmailVerified, pathname])

  // Auth routes always render immediately — not blocked by anything
  if (isAuthRoute) return <>{children}</>

  // Protected routes: gate until session confirms access
  // Window is hidden so the user sees nothing
  if (!isLoaded || !isSignedIn || !isEmailVerified) return null

  return <>{children}</>
}
