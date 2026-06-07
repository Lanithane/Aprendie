import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Resets the window to the top on every route change. React Router keeps the
// previous scroll offset across navigations, so without this a new view opens
// scrolled down to wherever the last one was — most jarring on iOS Safari at the
// xs breakpoint. Keyed on pathname (not search/hash) so in-page anchors and
// query-only updates don't yank the user back to the top.
export function useScrollToTop(): void {
  const { pathname } = useLocation()
  useEffect(() => {
    // 'instant' avoids a smooth-scroll animation on navigation; iOS Safari also
    // ignores smooth here mid-layout, so an explicit jump is the reliable reset.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
}
