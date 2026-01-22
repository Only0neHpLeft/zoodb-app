import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

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
  return <Outlet />
}
