import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { format } from 'date-fns'
import type { AttemptDto } from '../../api/historyApi'

interface AttemptDetailProps {
  entry: AttemptDto
  // Extra content rendered at the top of the detail, before the sentence. The admin
  // history panel uses this to surface the language-pair chip that drops out of the
  // narrowed row; the user-facing history page passes nothing.
  leading?: ReactNode
}

// Expanded "summary" view of a single attempt: an optional leading slot, the prompt
// sentence, the user's answer, the corrected answer, any mistakes, and a timestamp
// shown only on narrow screens (where the row header hides it). Shared by the
// user-facing history page and the admin user-history panel so both stay in sync.
export default function AttemptDetail({ entry, leading }: AttemptDetailProps) {
  return (
    <>
      {leading}
      <Typography variant='caption' color='text.secondary'>
        Sentence
      </Typography>
      <Typography
        lang={entry.learnLanguage}
        sx={{ mb: 1, fontWeight: 400, wordSpacing: '-0.05em' }}
      >
        {entry.promptText}
      </Typography>
      <Typography variant='caption' color='text.secondary'>
        Your answer
      </Typography>
      <Typography
        lang={entry.guessLanguage}
        sx={{ mb: 1, fontWeight: 400, wordSpacing: '-0.05em' }}
      >
        {entry.userAnswer}
      </Typography>
      <Typography variant='caption' color='text.secondary'>
        Correct
      </Typography>
      <Typography lang={entry.guessLanguage} sx={{ fontWeight: 400, wordSpacing: '-0.05em' }}>
        {entry.correctedAnswer}
      </Typography>
      {entry.mistakes.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant='caption' color='text.secondary'>
            Mistakes
          </Typography>
          {entry.mistakes.map((m, i) => (
            <Typography key={i} variant='body2' sx={{ mt: 0.5 }}>
              <strong lang={entry.learnLanguage}>{m.sourceText}</strong>: {m.explanation}
            </Typography>
          ))}
        </Box>
      )}
      <Typography
        variant='caption'
        sx={{ mt: 1.5, display: { xs: 'block', sm: 'none' }, color: 'text.secondary' }}
      >
        {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
      </Typography>
    </>
  )
}
