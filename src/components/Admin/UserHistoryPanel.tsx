import { useState } from 'react'
import { Stack, Typography, Button } from '@mui/material'
import LoadingSpinner from '../shared/LoadingSpinner'
import AttemptRow from '../History/AttemptRow'
import { useUserHistory } from '../../hooks/useUserHistory'

interface UserHistoryPanelProps {
  userId: string
}

// Read-only attempt history for a single user, shown inline in the admin user-detail page. Rows
// expand to reveal the user's answer and the correction (shared with the user-facing history
// page via AttemptRow); the language pair is shown since this view spans every pair.
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
        <AttemptRow
          key={it.id}
          entry={it}
          open={expanded === it.id}
          onToggle={() => setExpanded((cur) => (cur === it.id ? null : it.id))}
          showLanguagePair
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
