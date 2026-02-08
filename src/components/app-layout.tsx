import { useLocation } from "@tanstack/react-router"
import { WifiOff } from "lucide-react"
import { useOffline } from "@/contexts/offline-context"
import { useLanguage } from "@/contexts/language-context"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"

// Routes that render without the sidebar (centered layout)
const authRoutes = ["/sign-in", "/sign-up", "/verify-email"]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isAuthRoute = authRoutes.some(r => pathname?.startsWith(r))

  // Auth routes render bare (centered card layout)
  if (isAuthRoute) return <>{children}</>

  // Authenticated routes render with sidebar
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
