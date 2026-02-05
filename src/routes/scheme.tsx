import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useDbReady } from "@/components/db-init-background"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/scheme")({
  // Redirect /scheme to /scheme/animals (no standalone scheme page)
  beforeLoad: ({ location }) => {
    if (location.pathname === "/scheme" || location.pathname === "/scheme/") {
      throw redirect({ to: "/scheme/animals" })
    }
  },
  component: SchemeLayout,
})

function SchemeLayout() {
  const dbReady = useDbReady()

  if (!dbReady) {
    return (
      <div className="flex flex-col h-full w-full">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <Skeleton className="h-6 w-48" />
        </header>
        <main className="flex-1 p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-full max-w-sm" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return <Outlet />
}
