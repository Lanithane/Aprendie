import { rangeWindow } from './rangeWindow'
import {
  getAttemptSeries,
  getCorrectSeries,
  getUserAttemptStats,
} from '../../history/application/attemptMetrics'
import type { MetricsRange, UserMetricsView } from '../domain/Metrics'

// Per-account metrics, all scoped to the requested range: headline attempts + accuracy totals
// plus the attempts/accuracy-over-time series. Used by the history page (self) and admin
// user-detail.
export async function getUserMetrics(
  userId: string,
  range: MetricsRange
): Promise<UserMetricsView> {
  const { since, bucket } = rangeWindow(range)
  const [stats, attempts, correct] = await Promise.all([
    getUserAttemptStats(userId, since),
    getAttemptSeries({ userId, since, bucket }),
    getCorrectSeries({ userId, since, bucket }),
  ])
  return {
    totals: {
      attempts: stats.total,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
    },
    attempts,
    correct,
  }
}
