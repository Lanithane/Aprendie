import { useCallback, useState } from 'react'

// Desktop sidebar open/collapsed preference, persisted to localStorage so the rail keeps its
// state across reloads. Defaults to collapsed (the rail) for first-time visitors.
const STORAGE_KEY = 'aprendie:sidebarCollapsed'

function readStored(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'true' || v === 'false') return v === 'true'
  } catch {
    // ignore
  }
  return true
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState<boolean>(readStored)

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // ignore
    }
  }, [])

  const toggleCollapsed = useCallback(() => setCollapsed(!readStored()), [setCollapsed])

  return { collapsed, setCollapsed, toggleCollapsed }
}
