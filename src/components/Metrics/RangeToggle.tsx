import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import type { MetricsRange } from '../../api/metricsApi'

const OPTIONS: { value: MetricsRange; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '1w', label: '1W' },
  { value: '1d', label: '1D' },
]

// Time-range selector for the metrics line graphs (All / last week / last day).
export default function RangeToggle({
  value,
  onChange,
}: {
  value: MetricsRange
  onChange: (range: MetricsRange) => void
}) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size='small'
      onChange={(_, v: MetricsRange | null) => {
        if (v !== null) onChange(v)
      }}
    >
      {OPTIONS.map((o) => (
        <ToggleButton key={o.value} value={o.value}>
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
