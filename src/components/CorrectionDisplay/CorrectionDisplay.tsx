import { Card, CardContent, Typography, Stack, Chip, Box, Button, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { diffWordsWithSpace } from 'diff'
import { languageName, type LanguageCode, type WordToken } from '../../../shared/languages'
import { scoreToGrade } from '../../../shared/grades'
import type { CorrectionMistakeDto } from '../../api/correctionApi'
import { useAutoFocus } from '../../hooks/useAutoFocus'
import GradeChip from '../shared/GradeChip'
import SentenceTokens from '../SentenceTokens/SentenceTokens'

const normalizePunct = (s: string) => s.replace(/[''ʼ]/g, "'").replace(/[""]/g, '"')

interface CorrectionDisplayProps {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
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

const DiffLine = styled('div')`
  font-size: 1.1rem;
  line-height: 1.6;
  padding: ${({ theme }) => theme.spacing(1.25, 1.5)};
  border-radius: 12px;
  background: ${({ theme }) => theme.palette.surfaceContainerHighest};
  white-space: pre-wrap;
`

const Added = styled('span')`
  color: ${({ theme }) => theme.palette.success.main};
  font-weight: 700;
`

const Removed = styled('span')`
  color: ${({ theme }) => theme.palette.error.main};
  text-decoration: line-through;
  font-weight: 500;
`

const PromptHeadline = styled('div')`
  font-size: 1.7rem;
  font-weight: 500;
  line-height: 1.35;
  font-style: italic;
  padding: ${({ theme }) => theme.spacing(1, 0, 2)};
  ${({ theme }) => theme.breakpoints.down('sm')} {
    font-size: 1.35rem;
  }
`

const MistakeRow = styled(Stack)`
  padding: ${({ theme }) => theme.spacing(1.25, 1.5)};
  border-left: 4px solid ${({ theme }) => theme.palette.tertiary.main};
  background: ${({ theme }) => theme.palette.surfaceContainerHighest};
  border-radius: 0 12px 12px 0;
`

export default function CorrectionDisplay({
  learnLanguage,
  guessLanguage,
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
  const parts = diffWordsWithSpace(normalizePunct(userAnswer), normalizePunct(correctedAnswer))
  const visibleMistakes = mistakes.filter(
    (m) => normalizePunct(m.userPhrase) !== normalizePunct(m.correctPhrase)
  )
  const displayGrade = grade ?? scoreToGrade(score)

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
            {isCorrect ? 'Nice!' : "Close! Here's what to fix"}
          </Typography>
          <GradeChip grade={displayGrade} size='medium' />
        </Stack>

        <Typography variant='overline' color='text.secondary'>
          {languageName(learnLanguage)}
        </Typography>
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
