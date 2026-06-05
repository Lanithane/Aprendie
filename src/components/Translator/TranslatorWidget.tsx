import { useState } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import TranslateIcon from '@mui/icons-material/Translate'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { styled } from '@mui/material/styles'
import SectionCard from '../shared/SectionCard'
import { useTranslation } from '../../hooks/useTranslation'
import { LANGUAGES, type LanguagePair } from '../../../shared/languages'

const NoteBox = styled(Box)`
  padding: ${({ theme }) => theme.spacing(1.5)};
  background: ${({ theme }) => theme.palette.secondaryContainer};
  color: ${({ theme }) => theme.palette.onSecondaryContainer};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
`

// The whole direction label is a flat text button so tapping anywhere on it flips the direction.
// Pull it back by its own horizontal padding so the text lines up with the card title's left edge.
const DirectionButton = styled(Button)`
  text-transform: none;
  font: inherit;
  min-width: 0;
  padding: ${({ theme }) => theme.spacing(0.25, 0.75)};
  margin-left: ${({ theme }) => theme.spacing(-0.75)};
  color: inherit;
`

interface TranslatorWidgetProps {
  pair: LanguagePair
}

export default function TranslatorWidget({ pair }: TranslatorWidgetProps) {
  const [text, setText] = useState('')
  // Direction toggle. Not persisted — it resets to known → learning on every page mount.
  const [swapped, setSwapped] = useState(false)
  const { result, loading, error, submit, reset } = useTranslation()

  const knownName = LANGUAGES[pair.guessLanguage].name
  const targetName = LANGUAGES[pair.learnLanguage].name
  const localeLabel =
    LANGUAGES[pair.learnLanguage].locales.find((l) => l.code === pair.locale)?.label ?? pair.locale

  // The locale always rides with the learning language; only which side is source/target flips.
  const knownLabel = knownName
  const learnLabel = `${targetName} (${localeLabel})`
  const sourceLabel = swapped ? learnLabel : knownLabel
  const targetLabel = swapped ? knownLabel : learnLabel
  const targetLang = swapped ? pair.guessLanguage : pair.learnLanguage

  const canSubmit = text.trim().length > 0 && !loading

  const handleSubmit = () => {
    if (!canSubmit) return
    void submit({
      learnLanguage: pair.learnLanguage,
      guessLanguage: pair.guessLanguage,
      locale: pair.locale,
      text: text.trim(),
      swapped,
    })
  }

  const handleChange = (value: string) => {
    setText(value)
    if (result) reset()
  }

  const handleSwap = () => {
    setSwapped((s) => !s)
    // The existing result is for the old direction — clear it.
    if (result) reset()
  }

  const description = (
    <DirectionButton
      variant='text'
      color='inherit'
      onClick={handleSwap}
      aria-label={`Swap translation direction (currently ${sourceLabel} to ${targetLabel})`}
    >
      {sourceLabel}
      <SwapHorizIcon fontSize='small' sx={{ mx: 0.5, opacity: 0.7 }} />
      {targetLabel}
    </DirectionButton>
  )

  return (
    <Stack spacing={2}>
      <SectionCard title='Translate' description={description}>
        <Stack spacing={2}>
          <TextField
            // No floating label: the outline-notch label overlaps the border on iOS Safari, so we
            // follow PracticeCard's pattern (placeholder + aria-label). The source language is
            // already conveyed by the card description and the placeholder.
            aria-label={`Text in ${sourceLabel}`}
            placeholder={`Type something in ${sourceLabel}…`}
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            multiline
            minRows={3}
            fullWidth
            autoFocus
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant='contained'
              onClick={handleSubmit}
              disabled={!canSubmit}
              startIcon={
                loading ? <CircularProgress size={18} color='inherit' /> : <TranslateIcon />
              }
            >
              {loading ? 'Translating…' : 'Translate'}
            </Button>
          </Box>
        </Stack>
      </SectionCard>

      {error && <Alert severity='error'>{error}</Alert>}

      {result && (
        <SectionCard title={targetLabel}>
          <Stack spacing={1.5}>
            <Typography
              variant='h6'
              component='p'
              lang={targetLang}
              sx={{ whiteSpace: 'pre-wrap' }}
            >
              {result.translation}
            </Typography>
            {result.note && (
              <NoteBox>
                <Typography variant='body2'>{result.note}</Typography>
              </NoteBox>
            )}
          </Stack>
        </SectionCard>
      )}
    </Stack>
  )
}
