import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'gac:difficulty'

export type DifficultyPref = 1 | 2 | 3 | 4 | 5 | null

function read(): DifficultyPref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === null || v === '') return null
    const n = parseInt(v, 10)
    if (n >= 1 && n <= 5) return n as DifficultyPref
  } catch {
    // ignore
  }
  return null
}

export function useDifficultyPreference() {
  const [pref, setPrefState] = useState<DifficultyPref>(read())

  const setPref = useCallback((next: DifficultyPref) => {
    try {
      if (next === null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // ignore
    }
    setPrefState(next)
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefState(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { pref, setPref }
}
