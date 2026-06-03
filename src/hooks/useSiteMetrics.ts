import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { fetchSiteMetrics, type MetricsRange, type SiteMetrics } from '../api/metricsApi'

interface UseSiteMetricsResult {
  data: SiteMetrics | null
  loading: boolean
  error: string | null
}

// Loads sitewide admin metrics, refetching whenever the selected range changes. Previous data
// is kept while a new range loads so the panel doesn't flash a spinner on every toggle.
export function useSiteMetrics(range: MetricsRange): UseSiteMetricsResult {
  const [data, setData] = useState<SiteMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    fetchSiteMetrics(range)
      .then((d) => active && setData(d))
      .catch(
        (err) =>
          active && setError(err instanceof ApiError ? err.message : 'Failed to load metrics')
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [range])

  return { data, loading, error }
}
