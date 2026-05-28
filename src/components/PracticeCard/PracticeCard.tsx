import { useState, useRef, useEffect, type MouseEvent } from 'react'
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
import { useDifficultyPreference, type DifficultyPref } from '../../practice/useDifficultyPreference'

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
  spanish: string
  difficulty?: number | null
  grammarFocus?: string | null
  onSubmit: (englishGuess: string) => void
  submitting?: boolean
  disabled?: boolean
}

export default function PracticeCard({
  spanish,
  difficulty,
  grammarFocus,
  onSubmit,
  submitting,
  disabled,
}: PracticeCardProps) {
  const [guess, setGuess] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { pref, setPref } = useDifficultyPreference()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const menuOpen = Boolean(anchorEl)

  useEffect(() => {
    inputRef.current?.focus()
  }, [spanish])

  const submit = () => {
    const trimmed = guess.trim()
    if (!trimmed || submitting || disabled) return
    onSubmit(trimmed)
  }

  const openMenu = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const closeMenu = () => setAnchorEl(null)
  const pick = (next: DifficultyPref) => {
    setPref(next)
    closeMenu()
  }

  const chipLabel = pref !== null ? `Difficulty ${pref}/5` : 'Difficulty: any'

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
          {grammarFocus && <Chip size='small' label={grammarFocus} variant='outlined' />}
        </Stack>
        <Menu anchorEl={anchorEl} open={menuOpen} onClose={closeMenu}>
          <MenuItem selected={pref === null} onClick={() => pick(null)}>
            Any difficulty
          </MenuItem>
          <Divider />
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <MenuItem key={n} selected={pref === n} onClick={() => pick(n)}>
              {n}/5
            </MenuItem>
          ))}
        </Menu>

        <SentenceCenter lang='es'>{spanish}</SentenceCenter>

        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={3}
          placeholder='Translate to English…'
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          disabled={disabled || submitting}
          aria-label='Your English translation'
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
