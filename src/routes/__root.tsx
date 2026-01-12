import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

import ClerkProvider from '../integrations/clerk/provider'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/contexts/language-context'
import { MembershipProvider } from '@/contexts/membership-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import { CustomThemeInjector } from '@/components/custom-theme-injector'
import { UpdateChecker } from '@/components/update-checker'
import { AppLayout } from '@/components/app-layout'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ClerkProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LanguageProvider>
          <MembershipProvider>
            <SidebarProvider>
              <CustomThemeInjector />
              <UpdateChecker />
              <AppLayout>
                <Outlet />
              </AppLayout>
            </SidebarProvider>
          </MembershipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ClerkProvider>
  )
}