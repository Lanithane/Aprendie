import { useState, type MouseEvent } from 'react'
import {
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Chip,
  Menu,
  MenuItem,
  Divider,
  IconButton,
  Slider,
  Tooltip,
  Popover,
  Typography,
} from '@mui/material'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'
import { styled } from '@mui/material/styles'
import {
  languageName,
  type LanguageCode,
  type LocaleCode,
  type WordToken,
} from '../../../shared/languages'
import { LEVELS, levelLabel } from '../../../shared/levels'
import type { LevelPref } from '../../hooks/useLevelPreference'
import SentenceTokens from '../SentenceTokens/SentenceTokens'
import { useAutoFocus } from '../../hooks/useAutoFocus'
import { useSpeech } from '../../hooks/useSpeech'
import { useSpeechRate, MIN_RATE, MAX_RATE } from '../../hooks/useSpeechRate'

const SentenceCenter = styled('div')`
  text-align: center;
  font-size: 2.1rem;
  line-height: 1.35;
  font-weight: 500;
  padding: ${({ theme }) => theme.spacing(5, 2)};
  ${({ theme }) => theme.breakpoints.down('sm')} {
    font-size: 1.65rem;
    padding: ${({ theme }) => theme.spacing(3, 1)};
  }
`

// The "1.0×" affordance that opens the rate popover — quiet until the user reaches for it.
const RateButton = styled('button')`
  appearance: none;
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: ${({ theme }) => theme.spacing(0.5, 1)};
  border-radius: 999px;
  color: ${({ theme }) => theme.palette.text.secondary};
  &:hover {
    background: ${({ theme }) => theme.palette.action.hover};
    color: ${({ theme }) => theme.palette.primary.main};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: 1px;
  }
`

interface PracticeCardProps {
  promptText: string
  wordBreakdown: WordToken[]
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level: LevelPref
  onLevelChange: (level: LevelPref) => void
  onSubmit: (answer: string) => void
  submitting?: boolean
  disabled?: boolean
}

export default function PracticeCard({
  promptText,
  wordBreakdown,
  learnLanguage,
  guessLanguage,
  locale,
  level,
  onLevelChange,
  onSubmit,
  submitting,
  disabled,
}: PracticeCardProps) {
  const [guess, setGuess] = useState('')
  // Refocus the answer field each time a new sentence loads, so the flow stays keyboard-driven.
  const inputRef = useAutoFocus<HTMLInputElement>(promptText)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const menuOpen = Boolean(anchorEl)
  const [rateAnchor, setRateAnchor] = useState<HTMLElement | null>(null)
  const rateOpen = Boolean(rateAnchor)
  const { speak, cancel, speaking, supported: speechSupported } = useSpeech()
  const { rate, setRate } = useSpeechRate()

  const submit = () => {
    const trimmed = guess.trim()
    if (!trimmed || submitting || disabled) return
    onSubmit(trimmed)
  }

  const openMenu = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const closeMenu = () => setAnchorEl(null)
  const pick = (next: LevelPref) => {
    onLevelChange(next)
    closeMenu()
  }

  const guessName = languageName(guessLanguage)
  const chipLabel = level ? levelLabel(level) : 'Level: any'

  return (
    <Card>
      <CardContent>
        <Stack
          direction='row'
          spacing={1}
          sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Chip
            size='small'
            label={chipLabel}
            onClick={openMenu}
            clickable
            aria-haspopup='menu'
            aria-expanded={menuOpen}
          />
          {speechSupported && (
            <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
              <Tooltip title='Playback speed'>
                <RateButton
                  type='button'
                  onClick={(e) => setRateAnchor(e.currentTarget)}
                  aria-haspopup='dialog'
                  aria-expanded={rateOpen}
                  aria-label={`Playback speed: ${rate.toFixed(1)}×`}
                >
                  {rate.toFixed(1)}×
                </RateButton>
              </Tooltip>
              <Tooltip title={speaking ? 'Stop' : 'Listen'}>
                <IconButton
                  size='small'
                  color='primary'
                  onClick={() => (speaking ? cancel() : speak(promptText, locale, rate))}
                  aria-label={
                    speaking ? 'Stop reading the sentence aloud' : 'Read the sentence aloud'
                  }
                >
                  {speaking ? <StopRoundedIcon /> : <VolumeUpRoundedIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Stack>
        <Menu anchorEl={anchorEl} open={menuOpen} onClose={closeMenu}>
          <MenuItem selected={level === null} onClick={() => pick(null)}>
            Any level
          </MenuItem>
          <Divider />
          {LEVELS.map((l) => (
            <MenuItem key={l.code} selected={level === l.code} onClick={() => pick(l.code)}>
              {l.cefr ? `${l.name} (${l.cefr})` : l.name}
            </MenuItem>
          ))}
        </Menu>

        <SentenceCenter>
          <SentenceTokens
            text={promptText}
            breakdown={wordBreakdown}
            learnLanguage={learnLanguage}
            guessLanguage={guessLanguage}
          />
        </SentenceCenter>

        <Popover
          open={rateOpen}
          anchorEl={rateAnchor}
          onClose={() => setRateAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
          slotProps={{ paper: { sx: { p: 2, width: 240 } } }}
        >
          <Typography variant='caption' color='text.secondary'>
            Playback speed
          </Typography>
          <Slider
            size='small'
            value={rate}
            min={MIN_RATE}
            max={MAX_RATE}
            step={0.1}
            marks={[
              { value: MIN_RATE, label: 'Slow' },
              { value: 1, label: '1×' },
              { value: MAX_RATE, label: 'Fast' },
            ]}
            valueLabelDisplay='auto'
            valueLabelFormat={(v) => `${v.toFixed(1)}×`}
            onChange={(_, v) => setRate(v)}
            aria-label='Speech rate'
          />
        </Popover>

        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={3}
          placeholder={`Translate to ${guessName}…`}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          disabled={disabled || submitting}
          aria-label={`Your ${guessName} translation`}
        />
        <Stack direction='row' sx={{ mt: 2, justifyContent: 'flex-end' }}>
          <Button
            variant='contained'
            onClick={submit}
            disabled={!guess.trim() || submitting || disabled}
          >
            {submitting ? 'Checking…' : 'Submit'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
