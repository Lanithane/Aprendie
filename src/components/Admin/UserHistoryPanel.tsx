import { useState } from 'react'
import { Box, Stack, Typography, Button, Collapse, IconButton, Chip } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { format } from 'date-fns'
import LoadingSpinner from '../shared/LoadingSpinner'
import GradeChip from '../shared/GradeChip'
import AttemptDetail from '../History/AttemptDetail'
import { useUserHistory } from '../../hooks/useUserHistory'
import { languageName } from '../../../shared/languages'
import type { AttemptDto } from '../../api/historyApi'

interface UserHistoryPanelProps {
  userId: string
}

// Read-only attempt history for a single user, shown inline in the admin table.
// Rows expand to reveal the user's answer and the correction, mirroring the
// user-facing history page.
export default function UserHistoryPanel({ userId }: UserHistoryPanelProps) {
  const { items, loading, loadingMore, error, hasMore, loadMore, reload } = useUserHistory(userId)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading) return <LoadingSpinner />
  if (error) {
    return (
      <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Typography color='error'>{error}</Typography>
        <Button size='small' color='secondary' onClick={() => void reload()}>
          Try again
        </Button>
      </Stack>
    )
  }
  if (items.length === 0)
    return <Typography color='text.secondary'>No attempts recorded.</Typography>

  return (
    <Stack spacing={1} sx={{ py: 1 }}>
      {items.map((it) => (
        <AdminHistoryRow
          key={it.id}
          entry={it}
          open={expanded === it.id}
          onToggle={() => setExpanded((cur) => (cur === it.id ? null : it.id))}
        />
      ))}
      {hasMore && (
        <Button
          size='small'
          color='tertiary'
          onClick={() => void loadMore()}
          disabled={loadingMore}
          sx={{ alignSelf: 'flex-start' }}
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </Stack>
  )
}

interface AdminHistoryRowProps {
  entry: AttemptDto
  open: boolean
  onToggle: () => void
}

function AdminHistoryRow({ entry, open, onToggle }: AdminHistoryRowProps) {
  const langLabel = `${languageName(entry.learnLanguage)} ⟶ ${languageName(entry.guessLanguage)}`
  const timeLabel = format(new Date(entry.createdAt), 'MMM d, h:mm a')
  return (
    <Box>
      <Box
        role='button'
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          cursor: 'pointer',
        }}
      >
        <GradeChip grade={entry.grade} />
        <Typography variant='body2' lang={entry.learnLanguage} sx={{ flex: 1, minWidth: 120 }}>
          {entry.promptText}
        </Typography>
        {/* Language pair and timestamp drop out of the row as it narrows (language
            first, then the timestamp) and reappear in the expanded detail below. */}
        <Chip
          size='small'
          variant='outlined'
          label={langLabel}
          sx={{ display: { xs: 'none', md: 'inline-flex' } }}
        />
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          {timeLabel}
        </Typography>
        <IconButton size='small' aria-label='Toggle attempt details' sx={{ p: 0.25 }}>
          <ExpandMoreIcon
            fontSize='small'
            sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
          />
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ pt: 1, pb: 0.5 }}>
          <AttemptDetail
            entry={entry}
            leading={
              <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 1.5 }}>
                <Chip size='small' variant='outlined' label={langLabel} />
              </Box>
            }
          />
        </Box>
      </Collapse>
    </Box>
  )
}
