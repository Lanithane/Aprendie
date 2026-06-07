import { lazy } from 'react'

// The exact factory shape React.lazy accepts (`() => Promise<{ default: Component }>`).
// Borrowing it keeps the component-type plumbing — and its internal `any` — inside
// React's types rather than ours; route elements take no props, so the erased
// component type is fine.
type LazyFactory = Parameters<typeof lazy>[0]

// After a deploy, Vite emits new content-hashed chunk filenames and the old ones
// are gone. A tab still running the previous build holds stale chunk URLs in its
// lazy() route imports, so the next navigation does a dynamic import() that 404s
// and rejects. With no error boundary around <Suspense>, React has no chunk to
// render and the screen goes white.
//
// A failed chunk import is, in practice, the signal that "this tab is running an
// old version": treat it as such and reload the page once. The fresh load pulls
// the current index.html (served no-cache) and its valid chunk URLs, so the
// navigation the user attempted resolves — react-router has already pushed the
// target URL, so reload() lands them on the page they were heading to.
//
// A sessionStorage flag caps this at a single reload: if the import still fails
// immediately after reloading (a genuinely broken deploy, or offline), we don't
// reload again — we let the error propagate instead of thrashing the page.
const RELOAD_FLAG = 'aprendie:chunk-reload'

export function lazyWithReload(factory: LazyFactory) {
  return lazy(() =>
    factory().then(
      (mod) => {
        // Import succeeded — clear the guard so the *next* deploy's stale-chunk
        // failure is allowed its own one-time reload.
        sessionStorage.removeItem(RELOAD_FLAG)
        return mod
      },
      (err: unknown) => {
        if (sessionStorage.getItem(RELOAD_FLAG)) throw err
        sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
        // Keep Suspense pending while the reload is in flight rather than
        // resolving to an error the user would see flash on screen.
        return new Promise<never>(() => {})
      }
    )
  )
}
