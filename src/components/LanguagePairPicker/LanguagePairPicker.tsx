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
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useLanguagePair } from '../../hooks/useLanguagePair'
import { useLocaleResolver } from '../../hooks/useLocaleResolver'
import { SUPPORTED_LANGUAGE_CODES, localesFor } from '../../../shared/languages'

export default function LanguagePairPicker() {
  const { t } = useTranslation()
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
        <InputLabel id='learn-label'>{t('languagePicker.wantToLearn')}</InputLabel>
        <Select
          labelId='learn-label'
          value={pair.learnLanguage}
          label={t('languagePicker.wantToLearn')}
          onChange={(e) => setLearnLanguage(e.target.value)}
        >
          {SUPPORTED_LANGUAGE_CODES.map((code) => (
            <MenuItem key={code} value={code}>
              {t(`languages.${code}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {showRegion && (
        <FormControl fullWidth>
          <InputLabel id='region-label'>{t('languagePicker.region')}</InputLabel>
          <Select
            labelId='region-label'
            value={pair.locale}
            label={t('languagePicker.region')}
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
        <Stack spacing={0.5}>
          <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              fullWidth
              size='small'
              label={t('languagePicker.orTypePlace')}
              placeholder={t('languagePicker.placeExample')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void onDetect()
                }
              }}
            />
            <Button
              color='secondary'
              onClick={() => void onDetect()}
              disabled={resolving || !location.trim()}
            >
              {resolving ? t('languagePicker.detecting') : t('languagePicker.detect')}
            </Button>
          </Stack>
          <Typography variant='caption' color='text.secondary'>
            {t('languagePicker.regionHelp')}
          </Typography>
        </Stack>
      )}

      <FormControl fullWidth>
        <InputLabel id='guess-label'>{t('languagePicker.translateInto')}</InputLabel>
        <Select
          labelId='guess-label'
          value={pair.guessLanguage}
          label={t('languagePicker.translateInto')}
          onChange={(e) => setGuessLanguage(e.target.value)}
        >
          {SUPPORTED_LANGUAGE_CODES.filter((c) => c !== pair.learnLanguage).map((code) => (
            <MenuItem key={code} value={code}>
              {t(`languages.${code}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && <Alert severity='error'>{error}</Alert>}
    </Stack>
  )
}
