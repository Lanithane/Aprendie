import { useCallback, useState } from 'react'
import { isCategoryId } from '../../shared/categories'

// The learner's pinned practice topic (a category id from shared/categories), or null = "shuffle all
// topics". It's a transient practice filter rather than a profile attribute, so — unlike level and
// language — it lives in localStorage (like the auto-speak / sidebar prefs) and is sent to the server
// only as a per-request query param. Persists across reloads; cleared by choosing Shuffle.
export type CategoryPref = string | null

const STORAGE_KEY = 'aprendie:category'

function readStored(): CategoryPref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && isCategoryId(v)) return v
  } catch {
    // ignore unavailable storage
  }
  return null
}

export function useCategoryPreference() {
  const [pref, setPrefState] = useState<CategoryPref>(readStored)

  const setPref = useCallback((next: CategoryPref) => {
    setPrefState(next)
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore unavailable storage
    }
  }, [])

  return { pref, setPref }
}
