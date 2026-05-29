import { useMemo } from 'react'
import { loadHistory, type HistoryEntry } from '../history'
import type { LanguagePair } from '../../shared/languages'

export function useHistory(userId: string | undefined, pair: LanguagePair): HistoryEntry[] {
  return useMemo(() => {
    if (!userId) return []
    return loadHistory(userId, pair)
  }, [userId, pair])
}
