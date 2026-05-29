import { useState, useEffect, useCallback } from 'react'
import { Box, Alert, CircularProgress } from '@mui/material'
import PracticeCard from '../components/PracticeCard/PracticeCard'
import CorrectionDisplay from '../components/CorrectionDisplay/CorrectionDisplay'
import ApiKeySetup from '../components/ApiKeySetup/ApiKeySetup'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'
import { useLocale } from '../locale/useLocale'
import { useDifficultyPreference } from '../practice/useDifficultyPreference'
import { appendHistory, type HistoryMistake } from '../history'

interface Sentence {
  id: string
  spanish: string
  expectedEnglish: string
  difficulty: number | null
  grammarFocus: string | null
  locale: string
}

interface Correction {
  sentenceId: string
  spanish: string
  expectedEnglish: string
  userEnglish: string
  isCorrect: boolean
  score: number
  correctedEnglish: string
  mistakes: HistoryMistake[]
  notes?: string
}

export default function HomePage() {
  const { user } = useAuth()
  const { locale } = useLocale()
  const { pref } = useDifficultyPreference()
  const [sentence, setSentence] = useState<Sentence | null>(null)
  const [correction, setCorrection] = useState<Correction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadSentence = useCallback(async () => {
    if (!user?.hasApiKey) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ locale })
      if (pref !== null) params.set('difficulty', String(pref))
      const s = await api<Sentence>(`/api/sentence?${params.toString()}`)
      setSentence(s)
      setCorrection(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sentence')
    } finally {
      setLoading(false)
    }
  }, [user?.hasApiKey, locale, pref])

  useEffect(() => {
    if (user?.hasApiKey && !sentence && !correction) {
      void loadSentence()
    }
  }, [user?.hasApiKey, sentence, correction, loadSentence])

  if (!user?.hasApiKey) return <ApiKeySetup />

  const handleSubmit = async (userEnglish: string) => {
    if (!sentence) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await api<Correction>('/api/correct', {
        method: 'POST',
        body: JSON.stringify({ sentenceId: sentence.id, userEnglish }),
      })
      setCorrection(result)
      appendHistory(user.id, locale, result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to correct')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    setCorrection(null)
    setSentence(null)
  }

  if (error) {
    return <Alert severity='error'>{error}</Alert>
  }

  if (loading && !sentence) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (correction) {
    return (
      <CorrectionDisplay
        spanish={correction.spanish}
        userEnglish={correction.userEnglish}
        correctedEnglish={correction.correctedEnglish}
        isCorrect={correction.isCorrect}
        score={correction.score}
        mistakes={correction.mistakes}
        notes={correction.notes}
        onNext={handleNext}
      />
    )
  }

  if (!sentence) return null

  return (
    <PracticeCard
      spanish={sentence.spanish}
      difficulty={sentence.difficulty}
      grammarFocus={sentence.grammarFocus}
      onSubmit={handleSubmit}
      submitting={submitting}
    />
  )
}
