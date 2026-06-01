import { Card, CardContent, Typography, Stack, Box, Alert, Divider } from '@mui/material'
import { styled } from '@mui/material/styles'
import LoadingSpinner from '../shared/LoadingSpinner'
import { useAdminAnalytics } from '../../hooks/useAdminAnalytics'

// Human labels for the instrumented event names; falls back to the raw name for any new event.
const EVENT_LABELS: Record<string, string> = {
  sentence_shown: 'Sentences shown',
  guess_submitted: 'Guesses submitted',
  grade_received: 'Grades received',
}

const Row = styled('div')`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(1, 0)};
`

function labelFor(name: string): string {
  return EVENT_LABELS[name] ?? name
}

export default function AnalyticsPanel() {
  const { summary, loading, error } = useAdminAnalytics()

  return (
    <Card variant='outlined'>
      <CardContent>
        <Typography variant='h6' sx={{ mb: 0.5 }}>
          Usage analytics
        </Typography>
        <Typography color='text.secondary' variant='body2' sx={{ mb: 2 }}>
          {summary
            ? `${summary.total.toLocaleString()} events in the last ${summary.sinceDays} days.`
            : 'Self-hosted event counts.'}
        </Typography>

        {error && <Alert severity='error'>{error}</Alert>}
        {loading ? (
          <LoadingSpinner />
        ) : summary && summary.counts.length > 0 ? (
          <Stack divider={<Divider />}>
            {summary.counts.map((c) => (
              <Row key={c.name}>
                <Typography>{labelFor(c.name)}</Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography component='span' sx={{ fontWeight: 600 }}>
                    {c.count.toLocaleString()}
                  </Typography>
                  <Typography component='span' color='text.secondary' variant='body2'>
                    {' '}
                    · {c.users} user{c.users === 1 ? '' : 's'}
                  </Typography>
                </Box>
              </Row>
            ))}
          </Stack>
        ) : (
          !error && (
            <Typography color='text.secondary' variant='body2'>
              No events recorded yet.
            </Typography>
          )
        )}
      </CardContent>
    </Card>
  )
}
