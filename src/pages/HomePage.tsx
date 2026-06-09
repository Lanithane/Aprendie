import { useState } from 'react'
import { Alert, Box, Button, Stack } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
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

// Top-anchored wrapper for every state of the flow — the prompt card, the streaming grade, the final
// correction, plus the access gate / onboarding / error views. The card grows downward from a fixed
// top edge so it never slides as the grade fills in (the suggested answer appears, then mistakes
// arrive row by row); a vertically centered card — whose position is derived from its height — would
// drift on every chunk. Everything is pinned to the top of the column rather than offset down it: an
// offset (we used a vh margin) pushed the answer field low enough that the mobile soft keyboard
// forced the browser to scroll the document to reveal it, and that scroll — compounded by iOS
// recomputing vh as its URL bar collapses — kept making typing jump around. Top-pinned, the field
// stays above the keyboard and nothing scrolls.
const Stage = styled('div')`
  width: 100%;
  padding-block: ${({ theme }) => theme.spacing(2)};
  ${({ theme }) => theme.breakpoints.down('md')} {
    padding-bottom: calc(${({ theme }) => theme.spacing(2)} + env(safe-area-inset-bottom));
  }
`

export default function HomePage() {
  const { t } = useTranslation()
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
      <Stage>
        <AccessGate access={user.access} email={user.email} />
      </Stage>
    )

  // First run: guide the learner's first choice and warm the pool before practice (Epic 11).
  if (needsOnboarding)
    return (
      <Stage>
        <OnboardingWizard error={onboardingError} preparing={preparing} onComplete={complete} />
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
              setPendingAnswer(null)
            }}
          >
            {t('common.tryAgain')}
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
      </Stage>
    )
  }

  // While the grade streams in, reveal it progressively in place of the practice card. Guarded on
  // pendingAnswer so we only enter once the learner has actually submitted (not on a bare reload).
  if (submitting && sentence && pendingAnswer !== null) {
    return (
      <Stage>
        <StreamingCorrection
          learnLanguage={sentence.learnLanguage}
          guessLanguage={sentence.guessLanguage}
          promptText={sentence.promptText}
          wordBreakdown={sentence.wordBreakdown}
          userAnswer={pendingAnswer}
          preview={preview ?? { mistakes: [] }}
        />
      </Stage>
    )
  }

  // Nothing to show yet. Render blank until the delay elapses, then a plain spinner — the
  // "preparing your first sentences" cold-start copy belongs to onboarding, not every load.
  if (loading || !sentence) return showLoader ? <LoadingSpinner /> : null

  return (
    <>
      <HomeTopBar level={level} onLevelChange={setLevel} />
      <Stage>
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
      </Stage>
    </>
  )
}
