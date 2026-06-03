import { useState, type ReactNode } from 'react'
import { Alert, Box, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import SectionCard from '../shared/SectionCard'
import LoadingSpinner from '../shared/LoadingSpinner'
import MetricStat from './MetricStat'
import RangeToggle from './RangeToggle'
import MetricsChart from './MetricsChart'
import { useSiteMetrics } from '../../hooks/useSiteMetrics'
import { formatUsd, formatWater } from '../Contribute/contribute'
import type { MetricsRange } from '../../api/metricsApi'

function ChartBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

// Sitewide usage for the admin landing page: headline totals plus attempts / spend / active-user
// line graphs with a shared range toggle.
export default function SiteMetricsPanel() {
  const [range, setRange] = useState<MetricsRange>('all')
  const { data, loading, error } = useSiteMetrics(range)
  const theme = useTheme()

  return (
    <SectionCard title='Site metrics' description='Usage across all accounts on the operator key.'>
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
            <MetricStat label='Users' value={data.totals.users.toLocaleString()} />
            <MetricStat label='Spend' value={formatUsd(data.totals.costUsd)} />
            <MetricStat label='Water (est.)' value={formatWater(data.totals.waterMl)} />
            <MetricStat label='Attempts' value={data.totals.attempts.toLocaleString()} />
            <MetricStat label='Accuracy' value={`${Math.round(data.totals.accuracy * 100)}%`} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <RangeToggle value={range} onChange={setRange} />
            </Box>
            <Stack spacing={3}>
              <ChartBlock title='Attempts'>
                <MetricsChart
                  data={data.attempts}
                  range={range}
                  color={theme.palette.primary.main}
                />
              </ChartBlock>
              <ChartBlock title='Spend (USD)'>
                <MetricsChart
                  data={data.cost}
                  range={range}
                  color={theme.palette.tertiary.main}
                  valueFormatter={formatUsd}
                />
              </ChartBlock>
              <ChartBlock title='Active users'>
                <MetricsChart
                  data={data.activeUsers}
                  range={range}
                  variant='bar'
                  color={theme.palette.secondary.main}
                />
              </ChartBlock>
            </Stack>
          </Box>
        </Stack>
      ) : null}
    </SectionCard>
  )
}
