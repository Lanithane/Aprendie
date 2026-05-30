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
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { languageName, type LanguageCode, type WordToken } from '../../../shared/languages'
import { LEVELS, levelLabel } from '../../../shared/levels'
import type { LevelPref } from '../../hooks/useLevelPreference'
import SentenceTokens from '../SentenceTokens/SentenceTokens'
import { useAutoFocus } from '../../hooks/useAutoFocus'

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

interface PracticeCardProps {
  promptText: string
  wordBreakdown: WordToken[]
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
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
        <Stack direction='row' spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
          <Chip
            size='small'
            label={chipLabel}
            onClick={openMenu}
            clickable
            aria-haspopup='menu'
            aria-expanded={menuOpen}
          />
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
