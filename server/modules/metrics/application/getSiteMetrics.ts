import { rangeWindow } from './rangeWindow'
import {
  getActiveUserSeries,
  getAttemptSeries,
  getSiteAttemptStats,
} from '../../history/application/attemptMetrics'
import { getCostSeries, getSiteShowback } from '../../showback/application/getShowback'
import { getUserCount } from '../../user/application/userStats'
import type { MetricsRange, SiteMetricsView } from '../domain/Metrics'

// Sitewide metrics: lifetime headline totals (from the full tables) plus three time series
// scoped to the requested range. Orchestrates the history, showback, and user contexts.
export async function getSiteMetrics(range: MetricsRange): Promise<SiteMetricsView> {
  const { since, bucket } = rangeWindow(range)
  const [users, stats, showback, attempts, cost, activeUsers] = await Promise.all([
    getUserCount(),
    getSiteAttemptStats(),
    getSiteShowback(),
    getAttemptSeries({ since, bucket }),
    getCostSeries({ since, bucket }),
    getActiveUserSeries({ since, bucket }),
  ])
  return {
    totals: {
      users,
      attempts: stats.total,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      costUsd: showback.totalCostUsd,
      waterMl: showback.estimate.waterMl,
    },
    attempts,
    cost: cost.map((p) => ({ bucket: p.bucket, value: p.costUsd })),
    activeUsers,
  }
}
