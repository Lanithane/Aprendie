import { Card, CardContent, Typography, Stack, Chip, Box, Button, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { diffWordsWithSpace } from 'diff'
import {
  languageName,
  type LanguageCode,
  type LocaleCode,
  type WordToken,
} from '../../../shared/languages'
import { scoreToGrade, type Grade } from '../../../shared/grades'
import type { CorrectionMistakeDto } from '../../api/correctionApi'
import { useAutoFocus } from '../../hooks/useAutoFocus'
import { useSpeech } from '../../hooks/useSpeech'
import { useSpeechRate } from '../../hooks/useSpeechRate'
import GradeChip, { PERFECT_GOLD } from '../shared/GradeChip'
import ListenControls from '../shared/ListenControls'
import SentenceTokens from '../SentenceTokens/SentenceTokens'
import { DiffLine, PromptHeadline, MistakeRow, Added, Removed } from './correctionStyles'
import { RESULT_TITLES, pickTitle } from './resultTitles'

// Normalize curly quotes to ASCII so a typographic apostrophe (e.g. Claude's "I\u2019m") does not
// diff against the user's straight-quote "I'm". Written as \u escapes, not literal smart-quote
// glyphs: a literal glyph here is easy for an editor/format pass to silently flatten to ASCII,
// which would turn this back into a no-op.
const normalizePunct = (s: string) =>
  s.replace(/[\u2018\u2019\u02bc]/g, "'").replace(/[\u201c\u201d]/g, '"')

// For the "Perfect!" exact-match check only: also drop trailing sentence-final punctuation. A
// missing (or extra) closing period is the one difference the grader already forgives \u2014 it scores
// such an answer A+ \u2014 so it shouldn't demote the headline to "Nice!" or split the answer into diff
// boxes whose sole highlight is a lone period. The displayed corrected answer keeps its period.
const normalizeForExactMatch = (s: string) => normalizePunct(s.trim()).replace(/[.!?\u2026]+$/u, '')

interface CorrectionDisplayProps {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  promptText: string
  wordBreakdown: WordToken[]
  userAnswer: string
  correctedAnswer: string
  isCorrect: boolean
  score: number
  grade?: string
  mistakes: CorrectionMistakeDto[]
  notes?: string
  onNext: () => void
}

// When the answer is a perfect match, both diff boxes would show the identical sentence — so we
// collapse to a single centered sentence, flanked by sparkles in both top corners (mirroring the
// A+ celebration on GradeChip).
const PerfectAnswer = styled('div')`
  position: relative;
  text-align: center;
  font-size: 1.1rem;
  line-height: 1.6;
  padding: ${({ theme }) => theme.spacing(2, 3.5)};
  border-radius: 12px;
  background: ${({ theme }) => theme.palette.surfaceContainerHighest};
  white-space: pre-wrap;
`

const Sparkle = styled(AutoAwesomeIcon)`
  position: absolute;
  top: ${({ theme }) => theme.spacing(0.75)};
  font-size: 18px;
  color: ${PERFECT_GOLD};
  filter: drop-shadow(0 0 1.5px ${PERFECT_GOLD}59);
`

export default function CorrectionDisplay({
  learnLanguage,
  guessLanguage,
  locale,
  promptText,
  wordBreakdown,
  userAnswer,
  correctedAnswer,
  isCorrect,
  score,
  grade,
  mistakes,
  notes,
  onNext,
}: CorrectionDisplayProps) {
  // Land focus on "Next" when the result appears, so submitting with Enter flows
  // straight into advancing to the next sentence with Enter.
  const nextRef = useAutoFocus<HTMLButtonElement>()
  const { speak, cancel, speaking, supported: speechSupported } = useSpeech()
  const { rate, setRate } = useSpeechRate()
  const parts = diffWordsWithSpace(normalizePunct(userAnswer), normalizePunct(correctedAnswer))
  // A duplicate/perfect translation: the corrected answer is identical to what the user wrote, so
  // the two diff boxes would just repeat the same sentence.
  const isExactMatch =
    normalizeForExactMatch(userAnswer) === normalizeForExactMatch(correctedAnswer)
  const visibleMistakes = mistakes.filter(
    (m) => normalizePunct(m.userPhrase) !== normalizePunct(m.correctPhrase)
  )
  const displayGrade: Grade = (grade as Grade | undefined) ?? scoreToGrade(score)
  // An exact match gets the dedicated "Perfect!" celebration; otherwise pick a varied headline for
  // this grade and outcome.
  const headline = isExactMatch
    ? 'Perfect!'
    : pickTitle(RESULT_TITLES[displayGrade][isCorrect ? 'success' : 'mistake'], userAnswer)

  return (
    <Card aria-live='polite'>
      <CardContent>
        <Stack
          direction='row'
          spacing={1.5}
          sx={{
            mb: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
            rowGap: 1,
          }}
        >
          {isCorrect ? (
            <CheckCircleIcon color='success' sx={{ fontSize: '2rem' }} />
          ) : (
            <CancelIcon color='warning' />
          )}
          <Typography variant='h5' sx={{ flex: '1 1 220px', minWidth: 0 }}>
            {headline}
          </Typography>
          <GradeChip grade={displayGrade} size='medium' />
        </Stack>

        <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant='overline' color='text.secondary'>
            {languageName(learnLanguage)}
          </Typography>
          {speechSupported && (
            <ListenControls
              text={promptText}
              locale={locale}
              speak={speak}
              cancel={cancel}
              speaking={speaking}
              rate={rate}
              setRate={setRate}
            />
          )}
        </Stack>
        {/* The challenge is over, so the sentence becomes a study aid: every word is clickable and
            its gloss shows at every level (alwaysShowGloss), not just Starter as during practice. */}
        <PromptHeadline>
          <SentenceTokens
            text={promptText}
            breakdown={wordBreakdown}
            learnLanguage={learnLanguage}
            guessLanguage={guessLanguage}
            alwaysShowGloss
          />
        </PromptHeadline>

        {isExactMatch ? (
          <Box>
            <PerfectAnswer lang={guessLanguage}>
              <Sparkle aria-hidden='true' sx={{ left: (theme) => theme.spacing(1) }} />
              {correctedAnswer}
              <Sparkle aria-hidden='true' sx={{ right: (theme) => theme.spacing(1) }} />
            </PerfectAnswer>
          </Box>
        ) : (
          <Stack spacing={1}>
            <Box>
              <Typography variant='overline' color='text.secondary'>
                Your answer
              </Typography>
              <DiffLine lang={guessLanguage}>
                {parts.map((p, i) => {
                  if (p.added) return null
                  if (p.removed) return <Removed key={i}>{p.value}</Removed>
                  return <span key={i}>{p.value}</span>
                })}
              </DiffLine>
            </Box>
            <Box>
              <Typography variant='overline' color='text.secondary'>
                Correct
              </Typography>
              <DiffLine lang={guessLanguage}>
                {parts.map((p, i) => {
                  if (p.removed) return null
                  if (p.added) return <Added key={i}>{p.value}</Added>
                  return <span key={i}>{p.value}</span>
                })}
              </DiffLine>
            </Box>
          </Stack>
        )}

        {visibleMistakes.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='overline' color='text.secondary'>
              Mistakes
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 1 }}>
              {visibleMistakes.map((m, i) => (
                <MistakeRow key={i} spacing={0.5}>
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <Chip size='small' lang={learnLanguage} label={m.sourceText} color='primary' />
                    <Typography variant='body2'>
                      <Removed>{m.userPhrase}</Removed>
                      {' ⇒ '}
                      <Added>{m.correctPhrase}</Added>
                    </Typography>
                  </Stack>
                  <Typography variant='body2' color='text.secondary'>
                    {m.explanation}
                  </Typography>
                </MistakeRow>
              ))}
            </Stack>
          </>
        )}

        {notes && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='overline' color='text.secondary'>
              Tip
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              {notes}
            </Typography>
          </>
        )}

        <Stack direction='row' sx={{ mt: 3, justifyContent: 'flex-end' }}>
          <Button ref={nextRef} color='primary' onClick={onNext} size='large'>
            Next ›
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
