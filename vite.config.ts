import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Fails the production build if any two emitted chunks import each other.
// Circular chunk imports are how the "Cannot set properties of undefined
// (setting 'Activity')" crash reached prod: React's runtime got split across two
// chunks that referenced one another, and the browser could evaluate them in an
// order that left React's exports object undefined. The bug is invisible in dev
// (no chunking) and easy to silently reintroduce by tweaking `manualChunks`, so
// we assert the chunk graph is acyclic at build time — `npm run build` (and thus
// the deploy) breaks loudly instead of shipping a white screen.
function assertAcyclicChunks(): Plugin {
  return {
    name: 'assert-acyclic-chunks',
    generateBundle(_options, bundle) {
      const imports = new Map<string, string[]>()
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk') imports.set(chunk.fileName, chunk.imports)
      }
      for (const [a, deps] of imports) {
        for (const b of deps) {
          if (imports.get(b)?.includes(a)) {
            this.error(
              `Circular chunk import between "${a}" and "${b}". This can crash ` +
                `at runtime (e.g. React's "setting 'Activity'" error). Adjust ` +
                `build.rollupOptions.output.manualChunks so the chunk graph is acyclic.`
            )
          }
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), assertAcyclicChunks()],
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
          // The `react` chunk must be the React RUNTIME ONLY — react, react-dom,
          // and its scheduler. Do NOT use a broad `id.includes('react')`: that
          // also sweeps in ecosystem libs (react-router, react-transition-group,
          // react-is) which depend on prop-types. prop-types lands in `vendor`
          // and itself imports react-is, so a broad match creates a react↔vendor
          // import cycle (react chunk → prop-types in vendor → react-is back in
          // react chunk). Rollup can then evaluate the two chunks in an order
          // that leaves React's exports object undefined when its module body
          // runs, producing the prod crash
          // "Cannot set properties of undefined (setting 'Activity')". The pure
          // runtime has no dependency on those ecosystem libs, so isolating it
          // leaves only a one-way vendor→react edge — no cycle. Everything else
          // (router, transition-group, react-is, prop-types, …) ships in
          // `vendor`; app-code deploys still don't bust it.
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
          return 'vendor'
        },
      },
    },
  },
})
