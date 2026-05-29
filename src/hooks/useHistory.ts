import { useEffect, useState } from 'react'
import { loadHistory, type HistoryEntry } from '../history'

export function useHistory(userId: string | undefined, locale: string): HistoryEntry[] {
  const [items, setItems] = useState<HistoryEntry[]>([])

  useEffect(() => {
    if (!userId) {
      setItems([])
      return
    }
    setItems(loadHistory(userId, locale))
  }, [userId, locale])

  return items
}
