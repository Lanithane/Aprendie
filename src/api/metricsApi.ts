import { api } from './client'

export type MetricsRange = 'all' | '1w' | '1d'

// One point on a line graph. `bucket` is a UTC key — 'YYYY-MM-DD' (daily) or
// 'YYYY-MM-DDTHH:00' (hourly) — and `value` a count or dollar amount. Mirrors the server's
// `MetricPoint`.
export interface MetricPoint {
  bucket: string
  value: number
}

// Mirrors the server's `SiteMetricsView`.
export interface SiteMetrics {
  totals: {
    users: number
    attempts: number
    accuracy: number
    costUsd: number
    waterMl: number
  }
  attempts: MetricPoint[]
  cost: MetricPoint[]
  activeUsers: MetricPoint[]
}

// Mirrors the server's `UserMetricsView`.
export interface UserMetrics {
  totals: {
    attempts: number
    accuracy: number
  }
  attempts: MetricPoint[]
  correct: MetricPoint[]
}

export function fetchSiteMetrics(range: MetricsRange): Promise<SiteMetrics> {
  return api<SiteMetrics>(`/api/metrics/site?range=${range}`)
}

export function fetchMyMetrics(range: MetricsRange): Promise<UserMetrics> {
  return api<UserMetrics>(`/api/metrics/me?range=${range}`)
}

export function fetchUserMetrics(id: string, range: MetricsRange): Promise<UserMetrics> {
  return api<UserMetrics>(`/api/metrics/users/${id}?range=${range}`)
}
