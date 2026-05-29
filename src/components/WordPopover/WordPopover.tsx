import { Popover, Box, Stack, Typography } from '@mui/material'
import { ROOT_LABEL, type LanguageCode, type WordToken } from '../../../shared/languages'

interface WordPopoverProps {
  anchorEl: HTMLElement | null
  token: WordToken | null
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  onClose: () => void
}

// Anchored card for a clicked word. The vocabulary stays immersive — the dictionary form
// (lemma) is in the learn language and the word's meaning is never translated. For an
// inflected word it shows the lemma plus each morphological change as `segment — note`. For a
// word already in its base form, repeating it adds nothing, so the heading reads "root"
// instead. Part of speech and notes are in the guess language. Driven by SentenceTokens.
export default function WordPopover({
  anchorEl,
  token,
  learnLanguage,
  guessLanguage,
  onClose,
}: WordPopoverProps) {
  const isBaseForm = token !== null && token.modifiers.length === 0
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
          <Stack direction='row' spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            {isBaseForm ? (
              <Typography
                variant='h6'
                component='span'
                lang={guessLanguage}
                sx={{ fontStyle: 'italic', color: 'text.secondary' }}
              >
                {ROOT_LABEL[guessLanguage]}
              </Typography>
            ) : (
              <Typography variant='h6' component='span' lang={learnLanguage}>
                {token.lemma}
              </Typography>
            )}
            {token.partOfSpeech && (
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ fontStyle: 'italic' }}
                lang={guessLanguage}
              >
                {token.partOfSpeech}
              </Typography>
            )}
          </Stack>
          {token.modifiers.length > 0 && (
            <Stack spacing={0.25} sx={{ mt: 0.75 }}>
              {token.modifiers.map((m, i) => (
                <Typography key={i} variant='body2'>
                  <Box component='span' sx={{ fontWeight: 600 }} lang={learnLanguage}>
                    {m.segment}
                  </Box>
                  {' — '}
                  <Box component='span' lang={guessLanguage}>
                    {m.note}
                  </Box>
                </Typography>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Popover>
  )
}
