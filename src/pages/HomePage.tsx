import { Alert } from '@mui/material'
import PracticeCard from '../components/PracticeCard/PracticeCard'
import CorrectionDisplay from '../components/CorrectionDisplay/CorrectionDisplay'
import ApiKeySetup from '../components/ApiKeySetup/ApiKeySetup'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { useAuth } from '../auth/AuthContext'
import { useLanguagePair } from '../hooks/useLanguagePair'
import { useLevelPreference } from '../hooks/useLevelPreference'
import { useCurrentSentence } from '../hooks/useCurrentSentence'
import { useCorrectionSubmission } from '../hooks/useCorrectionSubmission'

export default function HomePage() {
  const { user } = useAuth()
  const { pair } = useLanguagePair()
  const { pref: level, setPref: setLevel } = useLevelPreference()
  const {
    sentence,
    loading,
    error: sentenceError,
    clear,
  } = useCurrentSentence({
    enabled: Boolean(user?.hasApiKey),
    pair,
    level,
  })
  const { correction, submitting, error: submitError, submit, reset } = useCorrectionSubmission()

  if (!user?.hasApiKey) return <ApiKeySetup />

  const error = sentenceError ?? submitError
  if (error) return <Alert severity='error'>{error}</Alert>

  if (correction) {
    return (
      <CorrectionDisplay
        learnLanguage={correction.learnLanguage}
        guessLanguage={correction.guessLanguage}
        promptText={correction.promptText}
        userAnswer={correction.userAnswer}
        correctedAnswer={correction.correctedAnswer}
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
      promptText={sentence.promptText}
      wordBreakdown={sentence.wordBreakdown}
      learnLanguage={sentence.learnLanguage}
      guessLanguage={sentence.guessLanguage}
      level={level}
      onLevelChange={setLevel}
      grammarFocus={sentence.grammarFocus}
      onSubmit={(userAnswer) => {
        void submit(sentence.id, userAnswer)
      }}
      submitting={submitting}
    />
  )
}
