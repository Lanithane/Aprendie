import { Box, Stack, Typography, Chip, Button } from '@mui/material'
import { format } from 'date-fns'
import LoadingSpinner from '../shared/LoadingSpinner'
import { useUserHistory } from '../../hooks/useUserHistory'
import { languageName } from '../../../shared/languages'
import { scoreColor } from '../../theme/scoreColor'

interface UserHistoryPanelProps {
  userId: string
}

// Read-only attempt history for a single user, shown inline in the admin table.
export default function UserHistoryPanel({ userId }: UserHistoryPanelProps) {
  const { items, loading, loadingMore, error, hasMore, loadMore, reload } = useUserHistory(userId)

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
        <Box key={it.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip size='small' label={it.grade} color={scoreColor(it.score)} />
          <Typography variant='body2' lang={it.learnLanguage} sx={{ flex: 1, minWidth: 160 }}>
            {it.promptText}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {languageName(it.learnLanguage)} → {languageName(it.guessLanguage)}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {format(new Date(it.createdAt), 'MMM d, h:mm a')}
          </Typography>
        </Box>
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
