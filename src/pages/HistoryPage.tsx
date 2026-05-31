import { useState } from 'react'
import {
  Typography,
  Box,
  Stack,
  Collapse,
  Button,
  Alert,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { format } from 'date-fns'
import { useAuth } from '../auth/AuthContext'
import { useLanguagePair } from '../hooks/useLanguagePair'
import { useHistory } from '../hooks/useHistory'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import GradeChip from '../components/shared/GradeChip'
import { languageName } from '../../shared/languages'
import type { AttemptDto } from '../api/historyApi'

export default function HistoryPage() {
  const { user } = useAuth()
  const { pair } = useLanguagePair()
  const { items, loading, loadingMore, error, hasMore, loadMore, reload } = useHistory(
    user?.id,
    pair
  )
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!user) return null

  const attemptCountLabel = `${items.length} attempt${items.length === 1 ? '' : 's'} ${
    hasMore ? 'shown' : 'total'
  }`

  return (
    <Box>
      <Typography variant='h3' sx={{ mb: 1.5 }}>
        History
      </Typography>
      <Typography color='text.secondary' sx={{ mb: 3 }}>
        {languageName(pair.learnLanguage)} (<code>{pair.locale}</code>) →{' '}
        {languageName(pair.guessLanguage)}. {loading ? 'Loading attempts…' : attemptCountLabel}.
      </Typography>
      {error && (
        <Stack spacing={2} sx={{ mb: 2, alignItems: 'flex-start' }}>
          <Alert severity='error' sx={{ width: '100%' }}>
            {error}
          </Alert>
          <Button color='secondary' size='small' onClick={() => void reload()}>
            Try again
          </Button>
        </Stack>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Stack spacing={2}>
          {items.length === 0 && (
            <Typography color='text.secondary'>
              No history yet. Finish a sentence to see it here.
            </Typography>
          )}
          {items.length > 0 && (
            <Paper variant='outlined' sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <List disablePadding>
                {items.map((it, idx) => (
                  <HistoryRow
                    key={it.id}
                    entry={it}
                    open={expanded === it.id}
                    onToggle={() => setExpanded((cur) => (cur === it.id ? null : it.id))}
                    showDivider={idx < items.length - 1 || expanded === it.id}
                  />
                ))}
              </List>
            </Paper>
          )}
          {hasMore && (
            <Button
              color='tertiary'
              onClick={() => void loadMore()}
              disabled={loadingMore}
              sx={{ alignSelf: 'center' }}
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
  showDivider: boolean
}

function HistoryRow({ entry, open, onToggle, showDivider }: HistoryRowProps) {
  return (
    <>
      <ListItemButton
        onClick={onToggle}
        aria-expanded={open}
        aria-label='Toggle attempt details'
        sx={{ gap: 1, py: 1.25, px: 2, borderRadius: 0 }}
      >
        <GradeChip grade={entry.grade} />
        <ListItemText
          primary={entry.promptText}
          slotProps={{
            primary: {
              lang: entry.learnLanguage,
              noWrap: true,
              sx: { flex: 1, minWidth: 0 },
            },
          }}
        />
        <Typography variant='caption' sx={{ flexShrink: 0, color: 'text.secondary' }}>
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
      </ListItemButton>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
          <Typography variant='caption' color='text.secondary'>
            Your answer
          </Typography>
          <Typography lang={entry.guessLanguage} sx={{ mb: 1, fontWeight: 400 }}>
            {entry.userAnswer}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            Correct
          </Typography>
          <Typography lang={entry.guessLanguage} sx={{ fontWeight: 400 }}>
            {entry.correctedAnswer}
          </Typography>
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
      {showDivider && <Divider />}
    </>
  )
}
