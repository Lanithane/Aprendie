import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { fetchFeedback, type Feedback } from '../api/feedbackApi'

interface UseAdminFeedbackResult {
  feedback: Feedback[]
  loading: boolean
  error: string | null
}

// Loads the most recent feedback for the admin inbox once on mount.
export function useAdminFeedback(): UseAdminFeedbackResult {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetchFeedback()
      .then((items) => active && setFeedback(items))
      .catch(
        (err) =>
          active && setError(err instanceof ApiError ? err.message : 'Failed to load feedback')
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { feedback, loading, error }
}
