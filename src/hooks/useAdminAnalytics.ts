import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { fetchEventSummary, type EventSummary } from '../api/analyticsApi'

interface UseAdminAnalyticsResult {
  summary: EventSummary | null
  loading: boolean
  error: string | null
}

// Loads the event-count summary for the admin analytics panel once on mount.
export function useAdminAnalytics(days?: number): UseAdminAnalyticsResult {
  const [summary, setSummary] = useState<EventSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    fetchEventSummary(days)
      .then((s) => active && setSummary(s))
      .catch(
        (err) =>
          active && setError(err instanceof ApiError ? err.message : 'Failed to load analytics')
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [days])

  return { summary, loading, error }
}
