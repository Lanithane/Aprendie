import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Box,
  Divider,
  CircularProgress,
} from '@mui/material'
import { languageName, type LanguageCode, type WordToken } from '../../../shared/languages'
import type { CorrectionPreview } from '../../api/correctionApi'
import SentenceTokens from '../SentenceTokens/SentenceTokens'
import { DiffLine, PromptHeadline, MistakeRow, Added, Removed } from './correctionStyles'

interface StreamingCorrectionProps {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  promptText: string
  wordBreakdown: WordToken[]
  userAnswer: string
  preview: CorrectionPreview
}

// The live, in-progress grade shown while the model streams (see submitCorrectionStream). It mirrors
// the finished CorrectionDisplay's layout — prompt, the learner's answer, then the suggested answer
// and mistakes as they stream in — but holds the verdict and grade back until the authoritative
// result lands, so nothing has to snap to a different value when grading completes.
export default function StreamingCorrection({
  learnLanguage,
  guessLanguage,
  promptText,
  wordBreakdown,
  userAnswer,
  preview,
}: StreamingCorrectionProps) {
  const visibleMistakes = preview.mistakes.filter((m) => m.userPhrase !== m.correctPhrase)

  return (
    <Card aria-live='polite' aria-busy='true'>
      <CardContent>
        <Stack direction='row' spacing={1.5} sx={{ mb: 2, alignItems: 'center' }}>
          <CircularProgress size={22} aria-hidden='true' />
          <Typography variant='h5'>Checking your answer…</Typography>
        </Stack>

        <Typography variant='overline' color='text.secondary'>
          {languageName(learnLanguage)}
        </Typography>
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
            <DiffLine lang={guessLanguage}>{userAnswer}</DiffLine>
          </Box>
          {preview.correctedAnswer && (
            <Box>
              <Typography variant='overline' color='text.secondary'>
                Suggested
              </Typography>
              <DiffLine lang={guessLanguage}>{preview.correctedAnswer}</DiffLine>
            </Box>
          )}
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
      </CardContent>
    </Card>
  )
}
