import { useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import SectionCard from '../shared/SectionCard'
import VoicePicker from '../VoicePicker/VoicePicker'
import PreparingSentences from '../shared/PreparingSentences'
import { useLanguagePair } from '../../hooks/useLanguagePair'
import { useLevelPreference } from '../../hooks/useLevelPreference'
import {
  SUPPORTED_LANGUAGE_CODES,
  localesFor,
  defaultLocaleFor,
  type LanguageCode,
  type LocaleCode,
} from '../../../shared/languages'
import { LEVELS, type LevelCode } from '../../../shared/levels'
import { useLevelLabel } from '../../hooks/useLevelLabel'

interface OnboardingWizardProps {
  error: string | null
  // True once the learner has hit "Start" and we're saving + warming the first sentence.
  preparing: boolean
  onComplete: (
    pair: { learnLanguage: LanguageCode; guessLanguage: LanguageCode; locale: LocaleCode },
    level: LevelCode | null
  ) => void
}

export default function OnboardingWizard({ error, preparing, onComplete }: OnboardingWizardProps) {
  const { t } = useTranslation()
  const levelLabel = useLevelLabel()
  // Seed from the current (cache/default) pair + level so existing accounts see their last choice
  // pre-selected and brand-new ones get a sensible default.
  const { pair } = useLanguagePair()
  const { pref } = useLevelPreference()

  const [learn, setLearn] = useState<LanguageCode>(pair.learnLanguage)
  const [guess, setGuess] = useState<LanguageCode>(pair.guessLanguage)
  const [locale, setLocale] = useState<LocaleCode>(pair.locale)
  const [level, setLevel] = useState<LevelCode | null>(pref)

  const learnLocales = localesFor(learn)
  const showRegion = learnLocales.length > 1

  // Changing the learn language resets the locale to that language's default and swaps the guess
  // language out of the way if it would otherwise collide (mirrors useLanguagePair).
  const onLearnChange = (next: LanguageCode) => {
    if (next === guess) setGuess(learn)
    setLearn(next)
    setLocale(defaultLocaleFor(next))
  }

  // Once they hit "Start", swap the form for the warming state while the first sentence generates.
  if (preparing) {
    return (
      <Box sx={{ width: '100%', maxWidth: 460, mx: 'auto' }}>
        <PreparingSentences />
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 460, mx: 'auto' }}>
      <Stack spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant='h4'>{t('onboarding.welcome')}</Typography>
        <Typography variant='body1' color='text.secondary'>
          {t('onboarding.intro')}
        </Typography>
      </Stack>

      <SectionCard title={t('onboarding.practiceTitle')} description={t('onboarding.practiceDesc')}>
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel id='onboard-learn-label'>{t('languagePicker.wantToLearn')}</InputLabel>
            <Select
              labelId='onboard-learn-label'
              value={learn}
              label={t('languagePicker.wantToLearn')}
              onChange={(e) => onLearnChange(e.target.value)}
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
              <InputLabel id='onboard-region-label'>{t('languagePicker.region')}</InputLabel>
              <Select
                labelId='onboard-region-label'
                value={locale}
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

          <FormControl fullWidth>
            <InputLabel id='onboard-guess-label'>{t('languagePicker.translateInto')}</InputLabel>
            <Select
              labelId='onboard-guess-label'
              value={guess}
              label={t('languagePicker.translateInto')}
              onChange={(e) => setGuess(e.target.value)}
            >
              {SUPPORTED_LANGUAGE_CODES.filter((c) => c !== learn).map((code) => (
                <MenuItem key={code} value={code}>
                  {t(`languages.${code}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id='onboard-level-label'>{t('onboarding.difficultyLevel')}</InputLabel>
            <Select
              labelId='onboard-level-label'
              value={level ?? ''}
              label={t('onboarding.difficultyLevel')}
              onChange={(e) => setLevel(e.target.value || null)}
            >
              <MenuItem value=''>{t('common.anyLevel')}</MenuItem>
              {LEVELS.map((l) => (
                <MenuItem key={l.code} value={l.code}>
                  {levelLabel(l.code)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Voice is a per-device setting (localStorage, not the account), so unlike the staged
              fields above it persists immediately via the shared store — which also lets the
              preview button reflect the choice right away. It tracks the staged `learn`/`locale`
              rather than the saved pair, since neither is committed until "Start". */}
          <Box>
            <VoicePicker locale={locale} learnLanguage={learn} size='medium' />
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ display: 'block', mt: 0.75 }}
            >
              {t('onboarding.voiceNote')}
            </Typography>
          </Box>

          {error && <Alert severity='error'>{error}</Alert>}

          <Button
            variant='contained'
            size='large'
            fullWidth
            onClick={() =>
              onComplete({ learnLanguage: learn, guessLanguage: guess, locale }, level)
            }
          >
            {t('onboarding.start')}
          </Button>
        </Stack>
      </SectionCard>
    </Box>
  )
}
