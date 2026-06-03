import { rangeWindow } from './rangeWindow'
import { getAttemptSeries, getUserAttemptStats } from '../../history/application/attemptMetrics'
import { getUserShowback } from '../../showback/application/getShowback'
import type { MetricsRange, UserMetricsView } from '../domain/Metrics'

// Per-account metrics: lifetime + today headline totals plus the attempts-over-time series
// scoped to the requested range. Used by the history page (self) and admin user-detail.
export async function getUserMetrics(
  userId: string,
  range: MetricsRange
): Promise<UserMetricsView> {
  const { since, bucket } = rangeWindow(range)
  const [stats, showback, attempts] = await Promise.all([
    getUserAttemptStats(userId),
    getUserShowback(userId),
    getAttemptSeries({ userId, since, bucket }),
  ])
  return {
    totals: {
      attempts: stats.total,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      today: stats.today,
      costUsd: showback.totalCostUsd,
    },
    attempts,
  }
}
