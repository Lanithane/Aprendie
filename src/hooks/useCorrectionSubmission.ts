import { useCallback, useState } from 'react'
import { submitCorrection, type CorrectionDto } from '../api/correctionApi'
import { trackEvent } from '../api/analyticsApi'

interface UseCorrectionSubmissionResult {
  correction: CorrectionDto | null
  submitting: boolean
  error: string | null
  submit: (sentenceId: string, userAnswer: string) => Promise<CorrectionDto | null>
  reset: () => void
}

export function useCorrectionSubmission(): UseCorrectionSubmissionResult {
  const [correction, setCorrection] = useState<CorrectionDto | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async (sentenceId: string, userAnswer: string) => {
    setSubmitting(true)
    setError(null)
    // Lightweight usage metrics (Epic 16); fire-and-forget, never blocks the grade.
    trackEvent('guess_submitted', { sentenceId })
    try {
      const result = await submitCorrection(sentenceId, userAnswer)
      setCorrection(result)
      trackEvent('grade_received', { sentenceId, score: result.score, isCorrect: result.isCorrect })
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to correct')
      return null
    } finally {
      setSubmitting(false)
    }
  }, [])

  const reset = useCallback(() => {
    setCorrection(null)
    setError(null)
  }, [])

  return { correction, submitting, error, submit, reset }
}
