// Metrics is a read-only cross-context view (history + showback + user). The range the client
// asks for; the application maps each to a time window + bucket granularity.
export type MetricsRange = 'all' | '1w' | '1d'

// One point on a line graph: a pre-formatted UTC bucket key ('YYYY-MM-DD' for daily, or
// 'YYYY-MM-DDTHH:00' for hourly) and its value (a count or a dollar amount).
export interface MetricPoint {
  bucket: string
  value: number
}

// Sitewide metrics for the admin panel: lifetime headline totals plus three time series.
export interface SiteMetricsView {
  totals: {
    users: number
    attempts: number
    accuracy: number // 0..1
    costUsd: number
    waterMl: number
  }
  attempts: MetricPoint[]
  cost: MetricPoint[]
  activeUsers: MetricPoint[]
}

// Per-account metrics for the history page and the admin user-detail page: lifetime + today
// headline totals plus the account's attempts-over-time series.
export interface UserMetricsView {
  totals: {
    attempts: number
    accuracy: number // 0..1
    today: number
    costUsd: number
  }
  attempts: MetricPoint[]
}
