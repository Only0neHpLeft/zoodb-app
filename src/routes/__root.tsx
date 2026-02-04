import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { useEffect, Suspense } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getVersion } from '@tauri-apps/api/app'

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

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
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