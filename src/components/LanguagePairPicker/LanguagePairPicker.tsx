import { useState } from 'react'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  TextField,
  Button,
  Alert,
} from '@mui/material'
import { useLanguagePair } from '../../hooks/useLanguagePair'
import { useLocaleResolver } from '../../hooks/useLocaleResolver'
import { LANGUAGES, SUPPORTED_LANGUAGE_CODES, localesFor } from '../../../shared/languages'

export default function LanguagePairPicker() {
  const { pair, setLearnLanguage, setGuessLanguage, setLocale } = useLanguagePair()
  const { resolve, resolving, error } = useLocaleResolver()
  const [location, setLocation] = useState('')

  const learnLocales = localesFor(pair.learnLanguage)
  const showRegion = learnLocales.length > 1

  const onDetect = async () => {
    const trimmed = location.trim()
    if (!trimmed) return
    const locale = await resolve(pair.learnLanguage, trimmed)
    if (locale) setLocale(locale)
  }

  return (
    <Stack spacing={2}>
      <FormControl fullWidth>
        <InputLabel id='learn-label'>I want to learn</InputLabel>
        <Select
          labelId='learn-label'
          value={pair.learnLanguage}
          label='I want to learn'
          onChange={(e) => setLearnLanguage(e.target.value)}
        >
          {SUPPORTED_LANGUAGE_CODES.map((code) => (
            <MenuItem key={code} value={code}>
              {LANGUAGES[code].name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {showRegion && (
        <FormControl fullWidth>
          <InputLabel id='region-label'>Region</InputLabel>
          <Select
            labelId='region-label'
            value={pair.locale}
            label='Region'
            onChange={(e) => setLocale(e.target.value)}
          >
            {learnLocales.map((l) => (
              <MenuItem key={l.code} value={l.code}>
                {l.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {showRegion && (
        <Stack direction='row' spacing={1} sx={{ alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            size='small'
            label='Or type a place'
            placeholder='e.g. Buenos Aires'
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void onDetect()
              }
            }}
            helperText='Picks the best regional variant for your learning language.'
          />
          <Button
            onClick={() => void onDetect()}
            disabled={resolving || !location.trim()}
            sx={{ mt: 0.5 }}
          >
            {resolving ? 'Detecting…' : 'Detect'}
          </Button>
        </Stack>
      )}

      <FormControl fullWidth>
        <InputLabel id='guess-label'>Translate into</InputLabel>
        <Select
          labelId='guess-label'
          value={pair.guessLanguage}
          label='Translate into'
          onChange={(e) => setGuessLanguage(e.target.value)}
        >
          {SUPPORTED_LANGUAGE_CODES.filter((c) => c !== pair.learnLanguage).map((code) => (
            <MenuItem key={code} value={code}>
              {LANGUAGES[code].name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && <Alert severity='error'>{error}</Alert>}
    </Stack>
  )
}
