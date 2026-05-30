import { useEffect, useRef, type RefObject } from 'react'

// Focuses the referenced element on mount, and again whenever `key` changes.
// Keeps the "focus a DOM node on prop change" effect out of components and in a
// hook, per the repo's useEffect rules. Pass a changing `key` (e.g. the current
// prompt) to refocus on each new value; omit it to focus once on mount.
export function useAutoFocus<T extends HTMLElement>(key?: unknown): RefObject<T | null> {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [key])
  return ref
}
