import { Alert, Button, Stack } from '@mui/material'
import { styled } from '@mui/material/styles'
import PracticeCard from '../components/PracticeCard/PracticeCard'
import CorrectionDisplay from '../components/CorrectionDisplay/CorrectionDisplay'
import AccessGate from '../components/AccessGate/AccessGate'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { useAuth } from '../auth/AuthContext'
import { useLanguagePair } from '../hooks/useLanguagePair'
import { useLevelPreference } from '../hooks/useLevelPreference'
import { useCurrentSentence } from '../hooks/useCurrentSentence'
import { useCorrectionSubmission } from '../hooks/useCorrectionSubmission'

// Floats the practice flow in the vertical center of the content column (auto block margins
// absorb the slack above/below), giving the calm, centered "homepage" feel — biased above true
// center so it sits higher in the eyeline: ~12% of the viewport up on mobile, a gentle nudge on
// desktop.
const Stage = styled('div')`
  margin-block: auto;
  width: 100%;
  padding-block: ${({ theme }) => theme.spacing(2)};
  transform: translateY(-12vh);
  ${({ theme }) => theme.breakpoints.up('md')} {
    transform: translateY(-${({ theme }) => theme.spacing(6)});
  }
`

export default function HomePage() {
  const { user, isApproved, bootstrapSentence, consumeBootstrap } = useAuth()
  const { pair } = useLanguagePair()
  const { pref: level, setPref: setLevel } = useLevelPreference()
  const {
    sentence,
    loading,
    error: sentenceError,
    clear,
  } = useCurrentSentence({
    // Under the operator-key model practice is gated on approval, not on a personal key.
    enabled: isApproved,
    pair,
    level,
    initialSentence: bootstrapSentence,
    onConsumeInitial: consumeBootstrap,
  })
  const { correction, submitting, error: submitError, submit, reset } = useCorrectionSubmission()

  // A pending/blocked account can't spend the operator key.
  if (user && !isApproved)
    return (
      <Stage>
        <AccessGate access={user.access} email={user.email} />
      </Stage>
    )

  const error = sentenceError ?? submitError
  if (error)
    return (
      <Stage>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Alert severity='error' sx={{ width: '100%' }}>
            {error}
          </Alert>
          <Button
            color='secondary'
            onClick={() => {
              reset()
              clear()
            }}
          >
            Try again
          </Button>
        </Stack>
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
        locale={sentence.locale}
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
