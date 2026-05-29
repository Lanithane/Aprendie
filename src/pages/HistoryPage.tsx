import { useState } from 'react'
import {
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { format } from 'date-fns'
import { useAuth } from '../auth/AuthContext'
import { useLanguagePair } from '../hooks/useLanguagePair'
import { useHistory } from '../hooks/useHistory'
import { languageName } from '../../shared/languages'
import type { HistoryEntry } from '../history'

export default function HistoryPage() {
  const { user } = useAuth()
  const { pair } = useLanguagePair()
  const items = useHistory(user?.id, pair)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!user) return null

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 2 }}>
        History
      </Typography>
      <Typography color='text.secondary' sx={{ mb: 3 }}>
        Stored locally for {languageName(pair.learnLanguage)} → {languageName(pair.guessLanguage)} (
        <code>{pair.locale}</code>). {items.length} attempt
        {items.length === 1 ? '' : 's'}.
      </Typography>
      <Stack spacing={1}>
        {items.length === 0 && (
          <Typography color='text.secondary'>
            No history yet — finish a sentence to see it here.
          </Typography>
        )}
        {items.map((it, idx) => (
          <HistoryRow
            key={`${it.id}-${it.createdAt}-${idx}`}
            entry={it}
            open={expanded === `${it.id}-${it.createdAt}-${idx}`}
            onToggle={() => {
              const key = `${it.id}-${it.createdAt}-${idx}`
              setExpanded((cur) => (cur === key ? null : key))
            }}
          />
        ))}
      </Stack>
    </Box>
  )
}

interface HistoryRowProps {
  entry: HistoryEntry
  open: boolean
  onToggle: () => void
}

function HistoryRow({ entry, open, onToggle }: HistoryRowProps) {
  return (
    <Card variant='outlined'>
      <CardContent sx={{ pb: '16px !important' }}>
        <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
          <Chip size='small' label={entry.score} color={entry.isCorrect ? 'success' : 'warning'} />
          <Typography lang={entry.learnLanguage} sx={{ flex: 1 }} noWrap>
            {entry.promptText}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
          </Typography>
          <IconButton
            size='small'
            onClick={onToggle}
            aria-expanded={open}
            aria-label='Expand attempt'
          >
            <ExpandMoreIcon
              sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
            />
          </IconButton>
        </Stack>
        <Collapse in={open}>
          <Box sx={{ mt: 2 }}>
            <Typography variant='caption' color='text.secondary'>
              Your answer
            </Typography>
            <Typography lang={entry.guessLanguage} sx={{ mb: 1 }}>
              {entry.userAnswer}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Corrected
            </Typography>
            <Typography lang={entry.guessLanguage}>{entry.correctedAnswer}</Typography>
            {entry.mistakes.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant='caption' color='text.secondary'>
                  Mistakes
                </Typography>
                {entry.mistakes.map((m, i) => (
                  <Typography key={i} variant='body2' sx={{ mt: 0.5 }}>
                    <strong lang={entry.learnLanguage}>{m.sourceText}</strong>: {m.explanation}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}
