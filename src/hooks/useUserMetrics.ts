import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import {
  fetchMyMetrics,
  fetchUserMetrics,
  type MetricsRange,
  type UserMetrics,
} from '../api/metricsApi'

// Either the signed-in account (history page) or a specific account (admin user-detail).
export type UserMetricsSource = { kind: 'me' } | { kind: 'user'; id: string }

interface UseUserMetricsResult {
  data: UserMetrics | null
  loading: boolean
  error: string | null
}

// Loads per-account metrics, refetching when the source account or range changes.
export function useUserMetrics(
  source: UserMetricsSource,
  range: MetricsRange
): UseUserMetricsResult {
  const [data, setData] = useState<UserMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sourceId = source.kind === 'user' ? source.id : null

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    const request = sourceId ? fetchUserMetrics(sourceId, range) : fetchMyMetrics(range)
    request
      .then((d) => active && setData(d))
      .catch(
        (err) =>
          active && setError(err instanceof ApiError ? err.message : 'Failed to load metrics')
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [sourceId, range])

  return { data, loading, error }
}
