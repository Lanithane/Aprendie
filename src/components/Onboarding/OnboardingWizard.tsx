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
  CircularProgress,
} from '@mui/material'
import SectionCard from '../shared/SectionCard'
import { useLanguagePair } from '../../hooks/useLanguagePair'
import { useLevelPreference } from '../../hooks/useLevelPreference'
import {
  LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  localesFor,
  defaultLocaleFor,
  type LanguageCode,
  type LocaleCode,
} from '../../../shared/languages'
import { LEVELS, levelLabel, type LevelCode } from '../../../shared/levels'

interface OnboardingWizardProps {
  completing: boolean
  error: string | null
  onComplete: (
    pair: { learnLanguage: LanguageCode; guessLanguage: LanguageCode; locale: LocaleCode },
    level: LevelCode | null
  ) => void
}

// First-run setup (Epic 11). Stages the four inputs (learn → guess → locale → level) in LOCAL
// state — nothing persists until "Start" — so changing a select doesn't dismiss the wizard
// mid-edit. The single commit point hands them to `onComplete`, which warms the pool and persists.
export default function OnboardingWizard({ completing, error, onComplete }: OnboardingWizardProps) {
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

  if (completing) {
    return (
      <Stack spacing={3} sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress aria-label='Preparing your first sentences' />
        <Typography variant='h6'>Preparing your first sentences…</Typography>
        <Typography variant='body2' color='text.secondary'>
          This only happens once. Hang tight.
        </Typography>
      </Stack>
    )
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 460, mx: 'auto' }}>
      <Stack spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant='h4'>Welcome to Aprendie</Typography>
        <Typography variant='body1' color='text.secondary'>
          Tell us what you want to practice and we’ll have your first sentences ready.
        </Typography>
      </Stack>

      <SectionCard
        title='Your practice'
        description='You can change any of this later in Settings.'
      >
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel id='onboard-learn-label'>I want to learn</InputLabel>
            <Select
              labelId='onboard-learn-label'
              value={learn}
              label='I want to learn'
              onChange={(e) => onLearnChange(e.target.value)}
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
              <InputLabel id='onboard-region-label'>Region</InputLabel>
              <Select
                labelId='onboard-region-label'
                value={locale}
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

          <FormControl fullWidth>
            <InputLabel id='onboard-guess-label'>Translate into</InputLabel>
            <Select
              labelId='onboard-guess-label'
              value={guess}
              label='Translate into'
              onChange={(e) => setGuess(e.target.value)}
            >
              {SUPPORTED_LANGUAGE_CODES.filter((c) => c !== learn).map((code) => (
                <MenuItem key={code} value={code}>
                  {LANGUAGES[code].name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id='onboard-level-label'>Difficulty level</InputLabel>
            <Select
              labelId='onboard-level-label'
              value={level ?? ''}
              label='Difficulty level'
              onChange={(e) => setLevel(e.target.value || null)}
            >
              <MenuItem value=''>Any level</MenuItem>
              {LEVELS.map((l) => (
                <MenuItem key={l.code} value={l.code}>
                  {levelLabel(l.code)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {error && <Alert severity='error'>{error}</Alert>}

          <Button
            variant='contained'
            size='large'
            fullWidth
            onClick={() =>
              onComplete({ learnLanguage: learn, guessLanguage: guess, locale }, level)
            }
          >
            Start practicing
          </Button>
        </Stack>
      </SectionCard>
    </Box>
  )
}
