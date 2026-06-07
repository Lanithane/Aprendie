import * as historyRepository from '../persistence/historyRepository'
import type {
  AttemptStats,
  SeriesOptions,
  SeriesPoint,
  UserAttemptStats,
} from '../persistence/historyRepository'

// Read-only attempt aggregates, exposed for the metrics module to orchestrate. The history
// context owns the `attempts` table, so these stay here rather than the metrics module reaching
// into another module's persistence.
export type { AttemptStats, SeriesOptions, SeriesPoint, UserAttemptStats }

export function getAttemptSeries(opts: SeriesOptions): Promise<SeriesPoint[]> {
  return historyRepository.attemptsPerBucket(opts)
}

export function getCorrectSeries(opts: SeriesOptions): Promise<SeriesPoint[]> {
  return historyRepository.correctPerBucket(opts)
}

export function getActiveUserSeries(opts: Omit<SeriesOptions, 'userId'>): Promise<SeriesPoint[]> {
  return historyRepository.activeUsersPerBucket(opts)
}

export function getSiteAttemptStats(): Promise<AttemptStats> {
  return historyRepository.siteAttemptStats()
}

export function getUserAttemptStats(userId: string, since?: Date): Promise<UserAttemptStats> {
  return historyRepository.userAttemptStats(userId, since)
}
