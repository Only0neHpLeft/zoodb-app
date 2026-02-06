declare const __APP_VERSION__: string

import { createRootRouteWithContext, Outlet, useRouter } from '@tanstack/react-router'
import { useEffect, useState, Suspense } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getVersion } from '@tauri-apps/api/app'
import { AlertTriangle, RefreshCw, Home, Copy, Check } from 'lucide-react'

import { AuthProvider } from '../integrations/auth/provider'
import { ThemeProvider } from '../components/theme-provider'
import { LanguageProvider, useLanguage } from '../contexts/language-context'
import { MembershipProvider } from '../contexts/membership-context'
import { OfflineProvider } from '../contexts/offline-context'
import { SettingsSyncProvider } from '../hooks/use-settings-sync'
import { AppLayout } from '../components/app-layout'
import { DbInitProvider } from '../components/db-init-background'
import { LoadingScreen } from '../components/loading-screen'
import { UpdateChecker } from '../components/update-checker'
import { Button } from '../components/ui/button'
import { SidebarProvider } from '../components/ui/sidebar'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

function ErrorDetails({ error }: { error: Error }) {
  const [copied, setCopied] = useState(false)

  const errorText = [
    `Error: ${error.message}`,
    error.stack ? `\nStack trace:\n${error.stack}` : '',
    `\nApp version: ${__APP_VERSION__ ?? 'unknown'}`,
    `User agent: ${navigator.userAgent}`,
    `Timestamp: ${new Date().toISOString()}`,
  ].join('\n')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(errorText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <details className="rounded-lg border bg-muted/50 p-4 text-left">
      <summary className="cursor-pointer text-sm font-medium">
        Error details
      </summary>
      <div className="relative mt-2">
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Copy error details"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
        <pre className="overflow-auto rounded-md bg-muted p-3 pr-10 text-xs text-muted-foreground max-h-64">
          {errorText}
        </pre>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Copy the error above when filing a{' '}
        <a
          href="https://github.com/Only0neHpLeft/zoodb-app/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          bug report
        </a>.
      </p>
    </details>
  )
}

function RootErrorComponent({ error }: { error: Error }) {
  const router = useRouter()

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
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

          <ErrorDetails error={error} />

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
    </ThemeProvider>
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
      <SidebarProvider>
        <LanguageProvider>
          <WindowTitle />
          <UpdateChecker />
          <DbInitProvider>
            <AuthProvider>
              <OfflineProvider>
                <MembershipProvider>
                  <SettingsSyncProvider>
                    <Suspense fallback={<LoadingScreen />}>
                      <AppLayout>
                        <Outlet />
                      </AppLayout>
                    </Suspense>
                  </SettingsSyncProvider>
                </MembershipProvider>
              </OfflineProvider>
            </AuthProvider>
          </DbInitProvider>
        </LanguageProvider>
      </SidebarProvider>
    </ThemeProvider>
  )
}
