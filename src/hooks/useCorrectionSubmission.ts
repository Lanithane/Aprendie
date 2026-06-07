import { useCallback, useState } from 'react'
import {
  submitCorrection,
  submitCorrectionStream,
  type CorrectionDto,
  type CorrectionPreview,
} from '../api/correctionApi'
import { ApiError } from '../api/client'
import { trackEvent } from '../api/analyticsApi'
import { useDailyUsage } from '../usage/DailyUsageContext'

interface UseCorrectionSubmissionResult {
  correction: CorrectionDto | null
  preview: CorrectionPreview | null
  submitting: boolean
  error: string | null
  submit: (sentenceId: string, userAnswer: string) => Promise<CorrectionDto | null>
  reset: () => void
}

export function useCorrectionSubmission(): UseCorrectionSubmissionResult {
  const [correction, setCorrection] = useState<CorrectionDto | null>(null)
  const [preview, setPreview] = useState<CorrectionPreview | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { applySnapshot } = useDailyUsage()

  const submit = useCallback(
    async (sentenceId: string, userAnswer: string) => {
      setSubmitting(true)
      setError(null)
      setPreview(null)
      // Lightweight usage metrics (Epic 16); fire-and-forget, never blocks the grade.
      trackEvent('guess_submitted', { sentenceId })
      try {
        const result = await gradeWithStreamFallback(sentenceId, userAnswer, setPreview)
        setCorrection(result)
        // This grade counted against the daily cap — refresh the near-cap banner from its snapshot.
        applySnapshot(result.dailyUsage)
        trackEvent('grade_received', {
          sentenceId,
          score: result.score,
          isCorrect: result.isCorrect,
        })
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to correct')
        return null
      } finally {
        setSubmitting(false)
        setPreview(null)
      }
    },
    [applySnapshot]
  )

  const reset = useCallback(() => {
    setCorrection(null)
    setPreview(null)
    setError(null)
  }, [])

  return { correction, preview, submitting, error, submit, reset }
}

// Grade via the streaming endpoint for a progressive reveal, falling back to the blocking endpoint
// if the stream drops mid-grade. A gate failure (cap reached, spend paused, access) comes back as an
// ApiError before streaming starts — surface it directly rather than retrying the grade.
async function gradeWithStreamFallback(
  sentenceId: string,
  userAnswer: string,
  onPreview: (preview: CorrectionPreview) => void
): Promise<CorrectionDto> {
  try {
    return await submitCorrectionStream(sentenceId, userAnswer, onPreview)
  } catch (err) {
    if (err instanceof ApiError) throw err
    return submitCorrection(sentenceId, userAnswer)
  }
}
