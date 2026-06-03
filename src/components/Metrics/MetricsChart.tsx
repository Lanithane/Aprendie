import { useId } from 'react'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { format, parseISO } from 'date-fns'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MetricPoint, MetricsRange } from '../../api/metricsApi'

interface MetricsChartProps {
  data: MetricPoint[]
  // A color resolved from the theme by the caller (e.g. theme.palette.primary.main) — never a
  // hardcoded hex, so the chart stays theme-agnostic across all MD3 palettes + modes.
  color: string
  range: MetricsRange
  // 'area' is a filled line for continuous trends; 'bar' suits discrete per-bucket counts.
  variant?: 'area' | 'bar'
  valueFormatter?: (value: number) => string
  height?: number
}

// A theme-aware chart for a single metric series. Axis ticks adapt to the bucket granularity
// implied by the range (hourly for 1D, daily otherwise).
export default function MetricsChart({
  data,
  color,
  range,
  variant = 'area',
  valueFormatter,
  height = 200,
}: MetricsChartProps) {
  const theme = useTheme()
  // useId keeps each chart's gradient unique on a page with several charts; strip the colons
  // React emits so the value is a valid SVG id / url() reference.
  const gradientId = `metric-grad-${useId().replace(/:/g, '')}`

  if (data.length === 0) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant='body2' color='text.secondary'>
          No data yet.
        </Typography>
      </Box>
    )
  }

  const tickFormat = range === '1d' ? 'ha' : 'MMM d'
  const tooltipFormat = range === '1d' ? 'MMM d, ha' : 'MMM d, yyyy'
  const formatValue = valueFormatter ?? ((v: number) => v.toLocaleString())
  const margin = { top: 8, right: 8, bottom: 0, left: -12 }

  const grid = (
    <CartesianGrid strokeDasharray='3 3' stroke={theme.palette.outlineVariant} vertical={false} />
  )
  const xAxis = (
    <XAxis
      dataKey='bucket'
      tickFormatter={(b: string) => format(parseISO(b), tickFormat)}
      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
      tickLine={false}
      axisLine={false}
      minTickGap={24}
    />
  )
  const yAxis = (
    <YAxis
      tickFormatter={(v: number) => formatValue(v)}
      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
      tickLine={false}
      axisLine={false}
      width={48}
      allowDecimals={false}
    />
  )
  const tooltip = (
    <Tooltip
      // The series has no name, so drop the "name : value" separator — show just the value.
      separator=''
      contentStyle={{
        background: theme.palette.surfaceContainerHigh,
        border: `1px solid ${theme.palette.outlineVariant}`,
        borderRadius: 8,
        color: theme.palette.text.primary,
      }}
      labelFormatter={(b) => format(parseISO(b as string), tooltipFormat)}
      formatter={(v) => [formatValue(Number(v)), '']}
    />
  )

  return (
    <Box sx={{ height }}>
      <ResponsiveContainer width='100%' height='100%'>
        {variant === 'bar' ? (
          <BarChart data={data} margin={margin}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Bar dataKey='value' fill={color} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={margin}>
            <defs>
              <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor={color} stopOpacity={0.32} />
                <stop offset='100%' stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Area
              type='monotone'
              dataKey='value'
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </Box>
  )
}
