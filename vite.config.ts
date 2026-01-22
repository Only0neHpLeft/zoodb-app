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
  },
  build: {
    outDir: 'dist',
    // Clerk is ~3MB, pglite assets are large - this is expected
    chunkSizeWarningLimit: 3500,
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
            if (id.includes('@clerk') || id.includes('clerk')) return 'vendor-clerk'
            if (id.includes('@tanstack')) return 'vendor-tanstack'
            if (id.includes('@radix-ui')) return 'vendor-radix'
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
            // All other deps (react, etc) in one vendor chunk
            return 'vendor'
          }
        },
      },
    },
  },
})

export default config