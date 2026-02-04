import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'

import { router, queryClient } from './router'
import { ErrorBoundary } from './components/error-boundary'
import { closeDatabase } from './lib/db/pglite'

import './styles/globals.css'

// Handle unhandled promise rejections from PGlite sync operations
// These are non-critical errors from relaxedDurability mode
window.addEventListener('unhandledrejection', (event) => {
  // Check if it's a PGlite/IndexedDB sync error (these are often objects, not Errors)
  const reason = event.reason
  if (reason && typeof reason === 'object' && !(reason instanceof Error)) {
    // Log but don't crash - these are typically non-critical sync issues
    console.warn('Non-critical async error:', reason)
    event.preventDefault()
  }
})

// Cleanup database connection on page unload to prevent memory leaks
// This is especially important for HMR during development
window.addEventListener('beforeunload', () => {
  closeDatabase().catch(console.error)
})

// For Vite HMR - cleanup when the module is disposed
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    closeDatabase().catch(console.error)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)