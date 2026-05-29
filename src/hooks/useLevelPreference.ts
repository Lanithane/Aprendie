import { useCallback, useEffect, useState } from 'react'
import { isLevelCode, type LevelCode } from '../../shared/levels'

const STORAGE_KEY = 'gac:level'

export type LevelPref = LevelCode | null

function read(): LevelPref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && isLevelCode(v)) return v
  } catch {
    // ignore
  }
  return null
}

export function useLevelPreference() {
  const [pref, setPrefState] = useState<LevelPref>(read())

  const setPref = useCallback((next: LevelPref) => {
    try {
      if (next === null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
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
