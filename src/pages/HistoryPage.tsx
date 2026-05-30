import { useState } from 'react'
import {
  Typography,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Chip,
  Collapse,
  Button,
  Alert,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { format } from 'date-fns'
import { useAuth } from '../auth/AuthContext'
import { useLanguagePair } from '../hooks/useLanguagePair'
import { useHistory } from '../hooks/useHistory'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { languageName } from '../../shared/languages'
import { scoreColor } from '../theme/scoreColor'
import type { AttemptDto } from '../api/historyApi'

export default function HistoryPage() {
  const { user } = useAuth()
  const { pair } = useLanguagePair()
  const { items, loading, loadingMore, error, hasMore, loadMore } = useHistory(user?.id, pair)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!user) return null

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 2 }}>
        History
      </Typography>
      <Typography color='text.secondary' sx={{ mb: 3 }}>
        {languageName(pair.learnLanguage)} → {languageName(pair.guessLanguage)} (
        <code>{pair.locale}</code>). {items.length} attempt
        {items.length === 1 ? '' : 's'} loaded.
      </Typography>
      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Stack spacing={1}>
          {items.length === 0 && (
            <Typography color='text.secondary'>
              No history yet — finish a sentence to see it here.
            </Typography>
          )}
          {items.map((it) => (
            <HistoryRow
              key={it.id}
              entry={it}
              open={expanded === it.id}
              onToggle={() => setExpanded((cur) => (cur === it.id ? null : it.id))}
            />
          ))}
          {hasMore && (
            <Button
              onClick={() => void loadMore()}
              disabled={loadingMore}
              sx={{ alignSelf: 'center', mt: 1 }}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  )
}

interface HistoryRowProps {
  entry: AttemptDto
  open: boolean
  onToggle: () => void
}

function HistoryRow({ entry, open, onToggle }: HistoryRowProps) {
  return (
    <Card variant='outlined'>
      <CardActionArea onClick={onToggle} aria-expanded={open} aria-label='Toggle attempt details'>
        <CardContent sx={{ pb: '16px !important' }}>
          <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
            <Chip size='small' label={entry.score} color={scoreColor(entry.score)} />
            <Typography lang={entry.learnLanguage} sx={{ flex: 1, minWidth: 0 }} noWrap>
              {entry.promptText}
            </Typography>
            <Typography variant='caption' sx={{ flexShrink: 0 }}>
              {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
            </Typography>
            <ExpandMoreIcon
              sx={{
                flexShrink: 0,
                color: 'action.active',
                transform: open ? 'rotate(180deg)' : 'none',
                transition: '0.2s',
              }}
            />
          </Stack>
        </CardContent>
      </CardActionArea>
      <Collapse in={open}>
        <CardContent sx={{ pt: 0 }}>
          <Typography variant='caption'>Your answer</Typography>
          <Typography lang={entry.guessLanguage} sx={{ mb: 1 }}>
            {entry.userAnswer}
          </Typography>
          <Typography variant='caption'>Corrected</Typography>
          <Typography lang={entry.guessLanguage}>{entry.correctedAnswer}</Typography>
          {entry.mistakes.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant='caption'>Mistakes</Typography>
              {entry.mistakes.map((m, i) => (
                <Typography key={i} variant='body2' sx={{ mt: 0.5 }}>
                  <strong lang={entry.learnLanguage}>{m.sourceText}</strong>: {m.explanation}
                </Typography>
              ))}
            </Box>
          )}
        </CardContent>
      </Collapse>
    </Card>
  )
}
