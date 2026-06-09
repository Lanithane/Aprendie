import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { MetricsRange } from '../../api/metricsApi'

const OPTIONS: {
  value: MetricsRange
  labelKey: 'metrics.rangeAll' | 'metrics.range1w' | 'metrics.range1d'
}[] = [
  { value: 'all', labelKey: 'metrics.rangeAll' },
  { value: '1w', labelKey: 'metrics.range1w' },
  { value: '1d', labelKey: 'metrics.range1d' },
]

// Time-range selector for the metrics line graphs (All / last week / last day).
export default function RangeToggle({
  value,
  onChange,
}: {
  value: MetricsRange
  onChange: (range: MetricsRange) => void
}) {
  const { t } = useTranslation()
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
          {t(o.labelKey)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
