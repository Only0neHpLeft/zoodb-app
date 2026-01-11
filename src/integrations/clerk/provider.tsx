import { Suspense, use } from 'react'
import type { Clerk } from '@clerk/clerk-js'
import { ClerkProvider } from '@clerk/clerk-react'
import { initClerk } from 'tauri-plugin-clerk'

interface ClerkProviderWrapperProps {
  children: React.ReactNode
}

const clerkPromise = initClerk()

function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ClerkProviderInner clerkPromise={clerkPromise}>
        {children}
      </ClerkProviderInner>
    </Suspense>
  )
}

function ClerkProviderInner({ 
  clerkPromise, 
  children 
}: { 
  clerkPromise: Promise<Clerk>
  children: React.ReactNode 
}) {
  const clerk = use(clerkPromise)
  
  return (
    <ClerkProvider 
      publishableKey={clerk.publishableKey} 
      Clerk={clerk}
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  )
}

export default ClerkProviderWrapper