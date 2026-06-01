import { Card, CardContent, Typography, Stack, Chip, Box, Alert, Divider } from '@mui/material'
import type { ChipProps } from '@mui/material'
import { format } from 'date-fns'
import LoadingSpinner from '../shared/LoadingSpinner'
import { useAdminFeedback } from '../../hooks/useAdminFeedback'
import type { FeedbackCategory } from '../../api/feedbackApi'

const CATEGORY_META: Record<
  FeedbackCategory,
  { label: string; color: NonNullable<ChipProps['color']> }
> = {
  idea: { label: 'Idea', color: 'primary' },
  bug: { label: 'Bug', color: 'error' },
  praise: { label: 'Praise', color: 'success' },
  other: { label: 'Other', color: 'default' },
}

export default function FeedbackPanel() {
  const { feedback, loading, error } = useAdminFeedback()

  return (
    <Card variant='outlined'>
      <CardContent>
        <Typography variant='h6' sx={{ mb: 0.5 }}>
          Feedback
        </Typography>
        <Typography color='text.secondary' variant='body2' sx={{ mb: 2 }}>
          {feedback.length > 0
            ? `${feedback.length} most recent submission${feedback.length === 1 ? '' : 's'}.`
            : 'User-submitted ideas, bugs, and praise.'}
        </Typography>

        {error && <Alert severity='error'>{error}</Alert>}
        {loading ? (
          <LoadingSpinner />
        ) : feedback.length > 0 ? (
          <Stack spacing={1.5} divider={<Divider />}>
            {feedback.map((f) => {
              const meta = CATEGORY_META[f.category]
              return (
                <Box key={f.id}>
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}
                  >
                    <Chip size='small' label={meta.label} color={meta.color} variant='outlined' />
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {f.userName || f.userEmail || 'Unknown'}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {format(new Date(f.createdAt), 'MMM d, h:mm a')}
                    </Typography>
                  </Stack>
                  <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                    {f.message}
                  </Typography>
                  {f.page && (
                    <Typography variant='caption' color='text.secondary'>
                      on {f.page}
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Stack>
        ) : (
          !error && (
            <Typography color='text.secondary' variant='body2'>
              No feedback yet.
            </Typography>
          )
        )}
      </CardContent>
    </Card>
  )
}
