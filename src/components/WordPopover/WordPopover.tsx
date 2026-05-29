import { Popover, Box, Stack, Typography } from '@mui/material'
import type { LanguageCode, WordToken } from '../../../shared/languages'

interface WordPopoverProps {
  anchorEl: HTMLElement | null
  token: WordToken | null
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  onClose: () => void
}

// Anchored card for a clicked word: its dictionary form (lemma), part of speech, and
// meaning in the guess language. Driven entirely by props from SentenceTokens.
export default function WordPopover({
  anchorEl,
  token,
  learnLanguage,
  guessLanguage,
  onClose,
}: WordPopoverProps) {
  return (
    <Popover
      open={Boolean(anchorEl && token)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      {token && (
        <Box sx={{ p: 1.5, maxWidth: 280 }}>
          <Stack direction='row' spacing={1} sx={{ alignItems: 'baseline', mb: 0.5 }}>
            <Typography variant='h6' component='span' lang={learnLanguage}>
              {token.lemma}
            </Typography>
            {token.partOfSpeech && (
              <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                {token.partOfSpeech}
              </Typography>
            )}
          </Stack>
          <Typography variant='body2' lang={guessLanguage}>
            {token.gloss}
          </Typography>
        </Box>
      )}
    </Popover>
  )
}
