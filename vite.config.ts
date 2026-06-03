import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing vendors into their own hashed chunks
        // so an app-code deploy doesn't bust the (cached, immutable) MUI/React
        // bundles. emotion rides with MUI since they're tightly coupled.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui'
          // recharts + its d3 deps are only used on the lazy admin/history routes — keep them
          // out of the eager `vendor` chunk so the practice path's first paint stays lean.
          if (
            id.includes('recharts') ||
            id.includes('victory-vendor') ||
            id.includes('d3-') ||
            id.includes('internmap')
          )
            return 'recharts'
          if (id.includes('react')) return 'react'
          return 'vendor'
        },
      },
    },
  },
})
