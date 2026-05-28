import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, TextField, Button, Stack, Chip } from '@mui/material'
import { styled } from '@mui/material/styles'

const SentenceCenter = styled('div')`
  text-align: center;
  font-size: 1.6rem;
  line-height: 1.4;
  padding: ${({ theme }) => theme.spacing(4, 2)};
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

  useEffect(() => {
    inputRef.current?.focus()
  }, [spanish])

  const submit = () => {
    const trimmed = guess.trim()
    if (!trimmed || submitting || disabled) return
    onSubmit(trimmed)
  }

  return (
    <Card>
      <CardContent>
        <Stack direction='row' spacing={1} sx={{ mb: 1 }}>
          {typeof difficulty === 'number' && (
            <Chip size='small' label={`Difficulty ${difficulty}/5`} />
          )}
          {grammarFocus && <Chip size='small' label={grammarFocus} variant='outlined' />}
        </Stack>
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
