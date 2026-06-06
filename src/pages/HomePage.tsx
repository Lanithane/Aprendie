import { Alert, Button, Stack } from '@mui/material'
import { styled } from '@mui/material/styles'
import PracticeCard from '../components/PracticeCard/PracticeCard'
import CorrectionDisplay from '../components/CorrectionDisplay/CorrectionDisplay'
import AccessGate from '../components/AccessGate/AccessGate'
import OnboardingWizard from '../components/Onboarding/OnboardingWizard'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { useAuth } from '../auth/AuthContext'
import { useLanguagePair } from '../hooks/useLanguagePair'
import { useLevelPreference } from '../hooks/useLevelPreference'
import { useCategoryPreference } from '../hooks/useCategoryPreference'
import { useOnboarding } from '../hooks/useOnboarding'
import { useCurrentSentence } from '../hooks/useCurrentSentence'
import { useCorrectionSubmission } from '../hooks/useCorrectionSubmission'

// Floats the practice flow in the vertical center of the content column (auto block margins
// absorb the slack above/below), giving the calm, centered "homepage" feel — biased above true
// center so it sits higher in the eyeline: ~12% of the viewport up on mobile, a gentle nudge on
// desktop.
const CenteredStage = styled('div')`
  margin-block: auto;
  width: 100%;
  padding-block: ${({ theme }) => theme.spacing(2)};
  transform: translateY(-12vh);
  ${({ theme }) => theme.breakpoints.up('md')} {
    transform: translateY(-${({ theme }) => theme.spacing(6)});
  }
`

const FlowStage = styled('div')`
  width: 100%;
  padding-block: ${({ theme }) => theme.spacing(2)};
  ${({ theme }) => theme.breakpoints.down('md')} {
    padding-bottom: calc(${({ theme }) => theme.spacing(2)} + env(safe-area-inset-bottom));
  }
`

export default function HomePage() {
  const { user, isApproved, bootstrapSentence, consumeBootstrap } = useAuth()
  const { pair } = useLanguagePair()
  const { pref: level, setPref: setLevel } = useLevelPreference()
  const { pref: category, setPref: setCategory } = useCategoryPreference()
  const { needsOnboarding, error: onboardingError, complete } = useOnboarding()
  const {
    sentence,
    loading,
    error: sentenceError,
    clear,
  } = useCurrentSentence({
    // Under the operator-key model practice is gated on approval, not on a personal key. Hold off
    // while onboarding is still pending so we don't fetch a sentence for the default pool before
    // the learner has chosen (and warmed) their own.
    enabled: isApproved && !needsOnboarding,
    pair,
    level,
    category,
    initialSentence: bootstrapSentence,
    onConsumeInitial: consumeBootstrap,
  })
  const { correction, submitting, error: submitError, submit, reset } = useCorrectionSubmission()

  // A pending/blocked account can't spend the operator key.
  if (user && !isApproved)
    return (
      <FlowStage>
        <AccessGate access={user.access} email={user.email} />
      </FlowStage>
    )

  // First run: guide the learner's first choice and warm the pool before practice (Epic 11).
  if (needsOnboarding)
    return (
      <FlowStage>
        <OnboardingWizard error={onboardingError} onComplete={complete} />
      </FlowStage>
    )

  const error = sentenceError ?? submitError
  if (error)
    return (
      <FlowStage>
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
      </FlowStage>
    )

  if (correction) {
    return (
      <FlowStage>
        <CorrectionDisplay
          learnLanguage={correction.learnLanguage}
          guessLanguage={correction.guessLanguage}
          locale={correction.locale}
          promptText={correction.promptText}
          wordBreakdown={correction.wordBreakdown}
          userAnswer={correction.userAnswer}
          correctedAnswer={correction.correctedAnswer}
          isCorrect={correction.isCorrect}
          score={correction.score}
          grade={correction.grade}
          mistakes={correction.mistakes}
          notes={correction.notes}
          onNext={() => {
            reset()
            clear()
          }}
        />
      </FlowStage>
    )
  }

  if (loading || !sentence) return <LoadingSpinner />

  return (
    <CenteredStage>
      <PracticeCard
        promptText={sentence.promptText}
        wordBreakdown={sentence.wordBreakdown}
        learnLanguage={sentence.learnLanguage}
        guessLanguage={sentence.guessLanguage}
        locale={sentence.locale}
        level={level}
        sentenceLevel={sentence.level}
        onLevelChange={setLevel}
        category={category}
        sentenceTheme={sentence.theme}
        onCategoryChange={setCategory}
        onSubmit={(userAnswer) => {
          void submit(sentence.id, userAnswer)
        }}
        submitting={submitting}
      />
    </CenteredStage>
  )
}
