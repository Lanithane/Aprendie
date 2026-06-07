import { useState } from 'react'
import { Alert, Box, Button, Stack } from '@mui/material'
import { styled } from '@mui/material/styles'
import PracticeCard from '../components/PracticeCard/PracticeCard'
import HomeTopBar from '../components/HomeTopBar/HomeTopBar'
import LevelSelectButton from '../components/HomeTopBar/LevelSelectButton'
import CorrectionDisplay from '../components/CorrectionDisplay/CorrectionDisplay'
import StreamingCorrection from '../components/CorrectionDisplay/StreamingCorrection'
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
import { useDelayedFlag } from '../hooks/useDelayedFlag'

// The vertical anchor shared by every card state of the practice flow — the prompt card, the
// streaming grade, and the final correction. We pin the card a fixed distance below the top of the
// content column (~upper quarter) and let it grow downward, rather than vertically centering it.
// That fixed offset is the whole point: the result card changes height several times as the grade
// streams in (the suggested answer appears, then mistakes arrive row by row), and a centered card —
// whose position is derived from its height — would slide upward on every chunk. Anchoring the top
// edge holds it still while the body fills in, and because the prompt card uses the very same anchor
// the transition from prompt → grade doesn't jump.
const PracticeStage = styled('div')`
  width: 100%;
  /* Phones sit the card high so the answer field clears the soft keyboard without the browser having
     to scroll the document to reveal it — that forced scroll (compounded by iOS recomputing vh as its
     URL bar collapses) is what made typing jump around. md+ drops it to the upper quarter; either way
     the top anchor holds, so prompt → streaming grade doesn't slide. */
  margin-top: 8vh;
  padding-bottom: ${({ theme }) => theme.spacing(2)};
  ${({ theme }) => theme.breakpoints.up('md')} {
    margin-top: 18vh;
  }
  ${({ theme }) => theme.breakpoints.down('md')} {
    padding-bottom: calc(${({ theme }) => theme.spacing(2)} + env(safe-area-inset-bottom));
  }
`

// Top-anchored wrapper for the flow's non-card states (access gate, onboarding, errors) — these
// aren't part of the prompt → grade visual continuity, so they just sit near the top.
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
  const { needsOnboarding, error: onboardingError, preparing, complete } = useOnboarding()
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
  const {
    correction,
    preview,
    submitting,
    error: submitError,
    submit,
    reset,
  } = useCorrectionSubmission()
  // The submitted answer, held so the streaming view can echo it back while grading (PracticeCard
  // owns the input, so it's captured on submit). Cleared when we leave the result view.
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null)

  // Gate the loading state behind a short delay so quick loads (a parked/prefetched sentence, a
  // warm pool) never flash a spinner — only a genuinely slow fetch crosses the threshold.
  const showLoader = useDelayedFlag(loading || !sentence, 350)

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
        <OnboardingWizard error={onboardingError} preparing={preparing} onComplete={complete} />
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
              setPendingAnswer(null)
            }}
          >
            Try again
          </Button>
        </Stack>
      </FlowStage>
    )

  if (correction) {
    return (
      <PracticeStage>
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
            setPendingAnswer(null)
          }}
        />
      </PracticeStage>
    )
  }

  // While the grade streams in, reveal it progressively in place of the practice card. Guarded on
  // pendingAnswer so we only enter once the learner has actually submitted (not on a bare reload).
  if (submitting && sentence && pendingAnswer !== null) {
    return (
      <PracticeStage>
        <StreamingCorrection
          learnLanguage={sentence.learnLanguage}
          guessLanguage={sentence.guessLanguage}
          promptText={sentence.promptText}
          wordBreakdown={sentence.wordBreakdown}
          userAnswer={pendingAnswer}
          preview={preview ?? { mistakes: [] }}
        />
      </PracticeStage>
    )
  }

  // Nothing to show yet. Render blank until the delay elapses, then a plain spinner — the
  // "preparing your first sentences" cold-start copy belongs to onboarding, not every load.
  if (loading || !sentence) return showLoader ? <LoadingSpinner /> : null

  return (
    <>
      <HomeTopBar level={level} onLevelChange={setLevel} />
      <PracticeStage>
        {/* md+: the level selector floats with the card, just above it and left-aligned. Below md
            it lives in the page-top bar instead (HomeTopBar). */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, mb: 1 }}>
          <LevelSelectButton level={level} onLevelChange={setLevel} />
        </Box>
        <PracticeCard
          promptText={sentence.promptText}
          wordBreakdown={sentence.wordBreakdown}
          learnLanguage={sentence.learnLanguage}
          guessLanguage={sentence.guessLanguage}
          locale={sentence.locale}
          sentenceLevel={sentence.level}
          category={category}
          sentenceTheme={sentence.theme}
          onCategoryChange={setCategory}
          onSubmit={(userAnswer) => {
            setPendingAnswer(userAnswer)
            void submit(sentence.id, userAnswer)
          }}
          submitting={submitting}
        />
      </PracticeStage>
    </>
  )
}
