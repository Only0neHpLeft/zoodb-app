import { createRootRouteWithContext, Outlet, ErrorComponent, useRouter } from '@tanstack/react-router'
import { useEffect, Suspense } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getVersion } from '@tauri-apps/api/app'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

import ClerkProvider from '../integrations/clerk/provider'
import { ConvexClientProvider } from '../integrations/convex/provider'
import { ThemeProvider } from '../components/theme-provider'
import { LanguageProvider, useLanguage } from '../contexts/language-context'
import { MembershipProvider } from '../contexts/membership-context'
import { OfflineProvider } from '../contexts/offline-context'
import { SettingsSyncProvider } from '../hooks/use-settings-sync'
import { AppLayout } from '../components/app-layout'
import { DbInitBackground } from '../components/db-init-background'
import { AppSkeleton } from '../components/app-skeleton'
import { Button } from '../components/ui/button'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

function RootErrorComponent({ error }: { error: Error }) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Error icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        {/* Error title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred while loading the application.
          </p>
        </div>

        {/* Error details (in development) */}
        {import.meta.env.DEV && (
          <details className="rounded-lg border bg-muted/50 p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium">
              Error details
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload application
          </Button>
          <Button
            onClick={() => router.navigate({ to: '/' })}
            variant="outline"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Go to home
          </Button>
        </div>
      </div>
    </div>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
  errorComponent: RootErrorComponent,
})

function WindowTitle() {
  const { language } = useLanguage()

  useEffect(() => {
    const updateTitle = async () => {
      try {
        const version = await getVersion()
        const appName = language === 'cz' ? 'Zoo Databáze' : 'Zoo Database'
        const title = `${appName} | v${version}`
        await getCurrentWindow().setTitle(title)
      } catch (error) {
        console.error('Failed to set window title:', error)
      }
    }
    updateTitle()
  }, [language])

  return null
}

function RootComponent() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LanguageProvider>
        <WindowTitle />
        <DbInitBackground />
        <ClerkProvider>
          <ConvexClientProvider>
            <OfflineProvider>
              <MembershipProvider>
                <SettingsSyncProvider>
                  {/* Suspense boundary for app shell - shows skeleton while AppLayout loads */}
                  <Suspense fallback={<AppSkeleton />}>
                    <AppLayout>
                      <Outlet />
                    </AppLayout>
                  </Suspense>
                </SettingsSyncProvider>
              </MembershipProvider>
            </OfflineProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}