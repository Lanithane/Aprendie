---
name: vite-chunk-cycle-react
description: vite manualChunks must keep the react chunk = runtime only (react/react-dom/scheduler), or a circular chunk import crashes prod
metadata:
  type: project
---

The prod crash `Uncaught TypeError: Cannot set properties of undefined (setting 'Activity')` was a Vite/rollup **circular chunk import**, not a React version mismatch (react+react-dom were both 19.2.6, deduped).

Cause: `manualChunks` in [vite.config.ts](vite.config.ts) used a broad `id.includes('react')` for the `react` chunk, which swept ecosystem libs (react-router, react-transition-group, react-is) in too. Those depend on `prop-types`, which lands in `vendor` and imports `react-is` back from the `react` chunk → a `react ↔ vendor` cycle. Rollup only **warns** ("Circular chunk: vendor -> react -> vendor") and still ships; the browser can evaluate the two chunks in an order that leaves React's exports object undefined when its module body runs `exports.Activity = …`.

**Why:** the bug is invisible in dev (no chunking) and only manifests in the chunked prod build, so it slipped past testing.

**How to apply:**

- The `react` chunk must be the React RUNTIME ONLY: match `/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/`. Never use bare `id.includes('react')`.
- A build-time guard `assertAcyclicChunks()` plugin in vite.config now hard-fails `npm run build` on any two-chunk cycle (turns rollup's soft warning into an error), so regressions break the deploy instead of shipping a white screen.
- General lesson: prod-only / build-output bugs need a build-time assertion, not just dev testing.

Related: [[cleanup-dead-code]]
