import { useState } from 'react'
import { Alert, Box, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import SectionCard from '../shared/SectionCard'
import LoadingSpinner from '../shared/LoadingSpinner'
import MetricStat from './MetricStat'
import RangeToggle from './RangeToggle'
import MetricsChart from './MetricsChart'
import { useUserMetrics, type UserMetricsSource } from '../../hooks/useUserMetrics'
import { formatUsd } from '../Contribute/contribute'
import type { MetricsRange } from '../../api/metricsApi'

// Per-account metrics, shared by the history page (self) and the admin user-detail page: headline
// lifetime/today totals plus an attempts-over-time line graph with a range toggle.
export default function UserMetrics({
  source,
  title = 'Metrics',
}: {
  source: UserMetricsSource
  title?: string
}) {
  const [range, setRange] = useState<MetricsRange>('all')
  const { data, loading, error } = useUserMetrics(source, range)
  const theme = useTheme()

  return (
    <SectionCard title={title} description='Practice activity and spend on the operator key.'>
      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!data && loading ? (
        <LoadingSpinner />
      ) : data ? (
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <MetricStat label='Attempts' value={data.totals.attempts.toLocaleString()} />
            <MetricStat label='Accuracy' value={`${Math.round(data.totals.accuracy * 100)}%`} />
            <MetricStat label='Today' value={data.totals.today.toLocaleString()} />
            <MetricStat label='Spend' value={formatUsd(data.totals.costUsd)} />
          </Box>
          <Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
                mb: 1,
              }}
            >
              <Typography variant='subtitle2' color='text.secondary'>
                Attempts over time
              </Typography>
              <RangeToggle value={range} onChange={setRange} />
            </Box>
            <MetricsChart data={data.attempts} range={range} color={theme.palette.primary.main} />
          </Box>
        </Stack>
      ) : null}
    </SectionCard>
  )
}
