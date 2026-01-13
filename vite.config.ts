import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    TanStackRouterVite(),
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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
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