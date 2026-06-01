import { useCallback, useState } from 'react'
import { translateText, type TranslationRequest, type TextTranslation } from '../api/translatorApi'

interface UseTranslationResult {
  result: TextTranslation | null
  loading: boolean
  error: string | null
  submit: (req: TranslationRequest) => Promise<TextTranslation | null>
  reset: () => void
}

export function useTranslation(): UseTranslationResult {
  const [result, setResult] = useState<TextTranslation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async (req: TranslationRequest) => {
    setLoading(true)
    setError(null)
    try {
      const res = await translateText(req)
      setResult(res)
      return res
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, loading, error, submit, reset }
}
