import { Alert } from '@mui/material'
import { styled } from '@mui/material/styles'
import PracticeCard from '../components/PracticeCard/PracticeCard'
import CorrectionDisplay from '../components/CorrectionDisplay/CorrectionDisplay'
import ApiKeySetup from '../components/ApiKeySetup/ApiKeySetup'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { useAuth } from '../auth/AuthContext'
import { useLanguagePair } from '../hooks/useLanguagePair'
import { useLevelPreference } from '../hooks/useLevelPreference'
import { useCurrentSentence } from '../hooks/useCurrentSentence'
import { useCorrectionSubmission } from '../hooks/useCorrectionSubmission'

// Floats the practice flow in the vertical center of the content column (auto block margins
// absorb the slack above/below), giving the calm, centered "homepage" feel — nudged a touch
// above true center on desktop so it sits a little higher in the eyeline.
const Stage = styled('div')`
  margin-block: auto;
  width: 100%;
  padding-block: ${({ theme }) => theme.spacing(2)};
  ${({ theme }) => theme.breakpoints.up('md')} {
    transform: translateY(-${({ theme }) => theme.spacing(4)});
  }
`

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
  if (error)
    return (
      <Stage>
        <Alert severity='error'>{error}</Alert>
      </Stage>
    )

  if (correction) {
    return (
      <Stage>
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
      </Stage>
    )
  }

  if (loading || !sentence) return <LoadingSpinner />

  return (
    <Stage>
      <PracticeCard
        promptText={sentence.promptText}
        wordBreakdown={sentence.wordBreakdown}
        learnLanguage={sentence.learnLanguage}
        guessLanguage={sentence.guessLanguage}
        level={level}
        onLevelChange={setLevel}
        onSubmit={(userAnswer) => {
          void submit(sentence.id, userAnswer)
        }}
        submitting={submitting}
      />
    </Stage>
  )
}
