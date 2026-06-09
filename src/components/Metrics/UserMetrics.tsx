import { useState } from 'react'
import { Alert, Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import SectionCard from '../shared/SectionCard'
import LoadingSpinner from '../shared/LoadingSpinner'
import MetricStat from './MetricStat'
import RangeToggle from './RangeToggle'
import AttemptsAccuracyChart from './AttemptsAccuracyChart'
import { numberFormatFor } from '../../i18n/formatLocale'
import { useUserMetrics, type UserMetricsSource } from '../../hooks/useUserMetrics'
import type { MetricsRange } from '../../api/metricsApi'

// Per-account metrics, shared by the history page (self) and the admin user-detail page: headline
// attempts + accuracy totals plus an attempts/accuracy-over-time chart, all scoped to the selected
// range.
export default function UserMetrics({
  source,
  title,
}: {
  source: UserMetricsSource
  title?: string
}) {
  const { t, i18n } = useTranslation()
  const [range, setRange] = useState<MetricsRange>('all')
  const { data, loading, error } = useUserMetrics(source, range)

  return (
    <SectionCard title={title ?? t('metrics.yourMetrics')} collapsible>
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
            <MetricStat
              label={t('metrics.attempts')}
              value={numberFormatFor(i18n.language).format(data.totals.attempts)}
            />
            <MetricStat
              label={t('metrics.accuracy')}
              value={`${Math.round(data.totals.accuracy * 100)}%`}
            />
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
                {t('metrics.overTime')}
              </Typography>
              <RangeToggle value={range} onChange={setRange} />
            </Box>
            <AttemptsAccuracyChart attempts={data.attempts} correct={data.correct} range={range} />
          </Box>
        </Stack>
      ) : null}
    </SectionCard>
  )
}
