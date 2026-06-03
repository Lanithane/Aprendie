import type { MetricsRange } from '../domain/Metrics'

export interface RangeWindow {
  since: Date | undefined
  bucket: 'day' | 'hour'
}

const DAY_MS = 24 * 60 * 60 * 1000

// Maps a requested range to a query window + bucket granularity. `1d` is the last 24h in hourly
// buckets; `1w` the last 7 days in daily buckets; `all` is everything (no lower bound), daily.
export function rangeWindow(range: MetricsRange): RangeWindow {
  switch (range) {
    case '1d':
      return { since: new Date(Date.now() - DAY_MS), bucket: 'hour' }
    case '1w':
      return { since: new Date(Date.now() - 7 * DAY_MS), bucket: 'day' }
    case 'all':
      return { since: undefined, bucket: 'day' }
  }
}
