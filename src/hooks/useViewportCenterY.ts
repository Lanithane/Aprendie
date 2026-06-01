import { useLayoutEffect, useState, type RefObject } from 'react'

// Reports the vertical centre (viewport px) of a referenced element, re-measuring on window resize
// and whenever `deps` change. Used to pin the sidebar's edge toggle onto the divider above the
// bottom rail, whose position shifts with sign-in state and viewport height.
export function useViewportCenterY(
  ref: RefObject<HTMLElement | null>,
  deps: ReadonlyArray<unknown> = []
): number | null {
  const [y, setY] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setY(rect.top + rect.height / 2)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return y
}
