import { Alert } from '@mui/material'
import PracticeCard from '../components/PracticeCard/PracticeCard'
import CorrectionDisplay from '../components/CorrectionDisplay/CorrectionDisplay'
import ApiKeySetup from '../components/ApiKeySetup/ApiKeySetup'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { useAuth } from '../auth/AuthContext'
import { useLocale } from '../hooks/useLocale'
import { useDifficultyPreference } from '../hooks/useDifficultyPreference'
import { useCurrentSentence } from '../hooks/useCurrentSentence'
import { useCorrectionSubmission } from '../hooks/useCorrectionSubmission'
import { appendHistory } from '../history'

export default function HomePage() {
  const { user } = useAuth()
  const { locale } = useLocale()
  const { pref } = useDifficultyPreference()
  const { sentence, loading, error: sentenceError, clear } = useCurrentSentence({
    enabled: Boolean(user?.hasApiKey),
    locale,
    difficulty: pref,
  })
  const { correction, submitting, error: submitError, submit, reset } = useCorrectionSubmission()

  if (!user?.hasApiKey) return <ApiKeySetup />

  const error = sentenceError ?? submitError
  if (error) return <Alert severity='error'>{error}</Alert>

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
        onNext={() => {
          reset()
          clear()
        }}
      />
    )
  }

  if (loading || !sentence) return <LoadingSpinner />

  return (
    <PracticeCard
      spanish={sentence.spanish}
      difficulty={sentence.difficulty}
      grammarFocus={sentence.grammarFocus}
      onSubmit={(userEnglish) => {
        void submit(sentence.id, userEnglish).then((result) => {
          if (result) appendHistory(user.id, locale, result)
        })
      }}
      submitting={submitting}
    />
  )
}
