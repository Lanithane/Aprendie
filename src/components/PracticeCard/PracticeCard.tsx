import { useState, type MouseEvent } from 'react'
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Button,
  Stack,
  Chip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import {
  languageName,
  type LanguageCode,
  type LocaleCode,
  type WordToken,
} from '../../../shared/languages'
import { LEVELS, levelLabel, type LevelCode } from '../../../shared/levels'
import type { LevelPref } from '../../hooks/useLevelPreference'
import SentenceTokens from '../SentenceTokens/SentenceTokens'
import ListenControls from '../shared/ListenControls'
import { useAutoFocus } from '../../hooks/useAutoFocus'
import { useSpeech } from '../../hooks/useSpeech'
import { useSpeechRate } from '../../hooks/useSpeechRate'
import { useAutoSpeak } from '../../hooks/useAutoSpeak'
import { useAutoSpeakPreference } from '../../hooks/useAutoSpeakPreference'

const SentenceCenter = styled('div')`
  text-align: center;
  font-size: 2.1rem;
  line-height: 1.35;
  font-weight: 800;
  padding: ${({ theme }) => theme.spacing(5, 2)};
  ${({ theme }) => theme.breakpoints.down('sm')} {
    font-size: 1.65rem;
    padding: ${({ theme }) => theme.spacing(3, 1)};
  }
`

interface PracticeCardProps {
  promptText: string
  wordBreakdown: WordToken[]
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level: LevelPref
  sentenceLevel?: LevelCode | null
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
  sentenceLevel,
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
  const { speak, cancel, speaking, supported: speechSupported, voices } = useSpeech()
  const { rate, setRate } = useSpeechRate()
  const { autoSpeak, delayMs } = useAutoSpeakPreference()
  // Opt-in auto-playback: read each new sentence aloud after the configured delay (Epic 15).
  // `ready` (voices loaded) lets auto-speak retry once the async voice list arrives — on mobile it
  // is empty on cold load, which is why playback sometimes didn't fire (see useAutoSpeak).
  useAutoSpeak({
    text: promptText,
    locale,
    rate,
    enabled: autoSpeak && speechSupported,
    delayMs,
    ready: voices.length > 0,
    speak,
  })

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
            <ListenControls
              text={promptText}
              locale={locale}
              speak={speak}
              cancel={cancel}
              speaking={speaking}
              rate={rate}
              setRate={setRate}
            />
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
            sentenceLevel={sentenceLevel}
          />
        </SentenceCenter>

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
            color='primary'
            onClick={submit}
            // Stay enabled while checking (re-entry is guarded in submit()) so the button keeps its
            // resting look and the aria-busy ring stays lit — disabling would blur it and grey it out.
            disabled={!guess.trim() || disabled}
            aria-busy={submitting}
          >
            {/* Hold the resting "Submit" width with a hidden copy and center the spinner over it,
                so the button doesn't resize when it flips into the loading state. */}
            <Box component='span' sx={{ visibility: submitting ? 'hidden' : 'visible' }}>
              Submit
            </Box>
            {submitting && (
              <CircularProgress
                size={18}
                color='inherit'
                aria-label='Checking'
                sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-9px', ml: '-9px' }}
              />
            )}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
