import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

// Dev-only middleware: relays OAuth OTT from system browser to Tauri app.
// Browser redirects to /auth-callback?ott=xxx → middleware stores it.
// Tauri app polls /api/auth-ott → gets the OTT and exchanges it.
function authCallbackPlugin(): Plugin {
  let pendingOtt: string | null = null

  return {
    name: 'auth-callback-relay',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/auth-callback')) {
          const url = new URL(req.url, 'http://localhost:3000')
          pendingOtt = url.searchParams.get('ott')
          res.setHeader('Content-Type', 'text/html')
          res.end(`<!DOCTYPE html>
<html><head><title>ZooDB</title><style>
  body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa; }
  .card { text-align: center; padding: 2rem; }
  h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
  p { color: #888; font-size: 0.875rem; }
</style></head>
<body><div class="card"><h1>Sign-in successful</h1><p>You can close this tab and return to Zoo Database.</p></div></body></html>`)
          return
        }

        if (req.url === '/api/auth-ott') {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          const ott = pendingOtt
          pendingOtt = null // one-time use
          res.end(JSON.stringify({ ott }))
          return
        }

        next()
      })
    },
  }
}

const config = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  plugins: [
    authCallbackPlugin(),
    TanStackRouterVite({
      // Enable automatic code splitting for routes (bundle-dynamic-imports rule)
      // Route configs stay in main bundle, components load on navigation
      autoCodeSplitting: true,
    }),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    viteReact(),
  ],
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },
  server: {
    port: 3000,
    strictPort: false,
    // Pre-transform critical files on startup (Vite optimization)
    warmup: {
      clientFiles: [
        './src/routes/__root.tsx',
        './src/routes/index.tsx',
        './src/components/app-sidebar.tsx',
        './src/lib/db/pglite.ts',
      ],
    },
  },
  build: {
    outDir: 'dist',
    // pglite assets are large - this is expected
    chunkSizeWarningLimit: 2000,
    // Enable module preload for faster chunk loading (Vite optimization)
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      // Suppress warnings from pglite's node polyfills (browser doesn't need them)
      onwarn(warning, warn) {
        // Ignore pglite's node external warnings
        if (warning.code === 'MISSING_EXPORT' && warning.message.includes('__vite-browser-external')) {
          return
        }
        // Ignore eval warnings from pglite (it's from the WASM loader)
        if (warning.code === 'EVAL' && warning.id?.includes('pglite')) {
          return
        }
        warn(warning)
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Don't chunk PGlite - let it handle its own assets
            if (id.includes('@electric-sql/pglite')) return undefined
            
            // Group by major library to avoid circular deps
            // Better Auth
            if (id.includes('better-auth') || id.includes('@convex-dev/better-auth') || id.includes('@daveyplate')) return 'vendor-better-auth'
            
            // TanStack packages together
            if (id.includes('@tanstack')) return 'vendor-tanstack'
            
            // Radix UI - many small packages, group them
            if (id.includes('@radix-ui')) return 'vendor-radix'
            
            // Convex - API client
            if (id.includes('convex')) return 'vendor-convex'
            
            // Utility libraries
            if (id.includes('date-fns') || id.includes('lodash') || id.includes('zod')) {
              return 'vendor-utils'
            }
            
            // All other deps (react, react-dom, etc) in one vendor chunk
            return 'vendor'
          }
          
        },
      },
    },
    // Enable source maps for debugging (can be disabled for production)
    sourcemap: false,
    // Minify better for smaller bundles
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ['console.debug'],
      },
    },
  },
})

export default config