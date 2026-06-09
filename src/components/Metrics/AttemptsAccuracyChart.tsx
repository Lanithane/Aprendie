import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { dateFnsLocaleFor, numberFormatFor } from '../../i18n/formatLocale'
import type { MetricPoint, MetricsRange } from '../../api/metricsApi'

interface AttemptsAccuracyChartProps {
  attempts: MetricPoint[]
  correct: MetricPoint[]
  range: MetricsRange
  height?: number
}

// Attempts-over-time as bars (counts, left axis) with accuracy overlaid as a line (percentage,
// right axis). Two scales share one chart so volume and quality read together per bucket. Both
// series are theme-resolved — never hardcoded hexes — so the chart stays MD3-agnostic.
export default function AttemptsAccuracyChart({
  attempts,
  correct,
  range,
  height = 200,
}: AttemptsAccuracyChartProps) {
  const theme = useTheme()
  const { t, i18n } = useTranslation()
  const dateLocale = dateFnsLocaleFor(i18n.language)
  const numberFormat = numberFormatFor(i18n.language)

  if (attempts.length === 0) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant='body2' color='text.secondary'>
          {t('metrics.noData')}
        </Typography>
      </Box>
    )
  }

  // Correct counts come back only for buckets that had a correct attempt; align them to the
  // attempts buckets (the superset) and derive accuracy as a 0–100 percentage per bucket.
  const correctByBucket = new Map(correct.map((p) => [p.bucket, p.value]))
  const data = attempts.map((p) => ({
    bucket: p.bucket,
    attempts: p.value,
    accuracy: p.value > 0 ? ((correctByBucket.get(p.bucket) ?? 0) / p.value) * 100 : 0,
  }))

  const tickFormat = range === '1d' ? 'ha' : 'MMM d'
  const tooltipFormat = range === '1d' ? 'MMM d, ha' : 'MMM d, yyyy'
  const attemptsColor = theme.palette.primary.main
  // Accuracy rides the fixed semantic "success" ramp (a green, theme-independent like error) rather
  // than another theme accent, so the line stays clearly distinct from the primary bars in every
  // palette — and green reads naturally for a correctness score.
  const accuracyColor = theme.palette.success.main

  return (
    <Box sx={{ height }}>
      <ResponsiveContainer width='100%' height='100%'>
        <ComposedChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -12 }}>
          <CartesianGrid
            strokeDasharray='3 3'
            stroke={theme.palette.outlineVariant}
            vertical={false}
          />
          <XAxis
            dataKey='bucket'
            tickFormatter={(b: string) => format(parseISO(b), tickFormat, { locale: dateLocale })}
            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            yAxisId='attempts'
            tickFormatter={(v: number) => numberFormat.format(v)}
            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
            tickLine={false}
            axisLine={false}
            width={48}
            allowDecimals={false}
          />
          <YAxis
            yAxisId='accuracy'
            orientation='right'
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: theme.palette.surfaceContainerHigh,
              border: `1px solid ${theme.palette.outlineVariant}`,
              borderRadius: 8,
              color: theme.palette.text.primary,
            }}
            labelFormatter={(b) =>
              format(parseISO(b as string), tooltipFormat, { locale: dateLocale })
            }
            formatter={(value, name) =>
              name === t('metrics.accuracy')
                ? [`${Math.round(Number(value))}%`, name]
                : [numberFormat.format(Number(value)), name]
            }
          />
          <Bar
            yAxisId='attempts'
            name={t('metrics.attempts')}
            dataKey='attempts'
            fill={attemptsColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
          <Line
            yAxisId='accuracy'
            name={t('metrics.accuracy')}
            type='monotone'
            dataKey='accuracy'
            stroke={accuracyColor}
            strokeWidth={2}
            dot={{ r: 2, fill: accuracyColor }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  )
}
