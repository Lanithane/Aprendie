import { useCallback, useState } from 'react'
import { submitCorrection, type CorrectionDto } from '../api/correctionApi'

interface UseCorrectionSubmissionResult {
  correction: CorrectionDto | null
  submitting: boolean
  error: string | null
  submit: (sentenceId: string, userEnglish: string) => Promise<CorrectionDto | null>
  reset: () => void
}

export function useCorrectionSubmission(): UseCorrectionSubmissionResult {
  const [correction, setCorrection] = useState<CorrectionDto | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async (sentenceId: string, userEnglish: string) => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitCorrection(sentenceId, userEnglish)
      setCorrection(result)
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
