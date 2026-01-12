import { useUser } from "@clerk/clerk-react"
import { useNavigate, useLocation } from "@tanstack/react-router"
import { useEffect } from "react"
import { Spinner } from "@/components/ui/spinner"

// Routes that don't require authentication
const publicRoutes = ["/sign-in", "/sign-up"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))

  useEffect(() => {
    if (!isLoaded) return

    // If not signed in and trying to access a protected route, redirect to sign-in
    if (!isSignedIn && !isPublicRoute) {
      navigate({ to: "/sign-in" as any })
    }

    // If signed in and on a public route (sign-in/sign-up), redirect to home
    if (isSignedIn && isPublicRoute) {
      navigate({ to: "/" })
    }
  }, [isLoaded, isSignedIn, isPublicRoute, navigate])

  // Show loading spinner while checking auth
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  // If not signed in and on protected route, show loading (will redirect)
  if (!isSignedIn && !isPublicRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return <>{children}</>
}
