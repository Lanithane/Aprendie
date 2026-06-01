import { useState, type KeyboardEvent } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import TranslateIcon from '@mui/icons-material/Translate'
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

interface TranslatorWidgetProps {
  pair: LanguagePair
}

export default function TranslatorWidget({ pair }: TranslatorWidgetProps) {
  const [text, setText] = useState('')
  const { result, loading, error, submit, reset } = useTranslation()

  const knownName = LANGUAGES[pair.guessLanguage].name
  const targetName = LANGUAGES[pair.learnLanguage].name
  const localeLabel =
    LANGUAGES[pair.learnLanguage].locales.find((l) => l.code === pair.locale)?.label ?? pair.locale

  const canSubmit = text.trim().length > 0 && !loading

  const handleSubmit = () => {
    if (!canSubmit) return
    void submit({
      learnLanguage: pair.learnLanguage,
      guessLanguage: pair.guessLanguage,
      locale: pair.locale,
      text: text.trim(),
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    }
  }

  const handleChange = (value: string) => {
    setText(value)
    if (result) reset()
  }

  return (
    <Stack spacing={2}>
      <SectionCard title='Translate' description={`${knownName} → ${targetName} (${localeLabel})`}>
        <Stack spacing={2}>
          <TextField
            label={`Text in ${knownName}`}
            placeholder={`Type something in ${knownName}…`}
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={handleKeyDown}
            multiline
            minRows={3}
            fullWidth
            autoFocus
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
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
            <Typography variant='caption' color='text.secondary'>
              ⌘/Ctrl + Enter
            </Typography>
          </Box>
        </Stack>
      </SectionCard>

      {error && <Alert severity='error'>{error}</Alert>}

      {result && (
        <SectionCard title={`${targetName} (${localeLabel})`}>
          <Stack spacing={1.5}>
            <Typography
              variant='h6'
              component='p'
              lang={pair.learnLanguage}
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
