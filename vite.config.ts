import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
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
    // Clerk is ~3MB, pglite assets are large - this is expected
    chunkSizeWarningLimit: 3500,
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
            // Clerk is the largest - keep it separate
            if (id.includes('@clerk') || id.includes('clerk')) return 'vendor-clerk'
            
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
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})

export default config