import * as eventRepository from '../persistence/eventRepository'
import type { EventSummary } from '../domain/Event'

const DEFAULT_DAYS = 30
const MAX_DAYS = 365

// Admin analytics: per-event-name counts over a recent window.
export async function summarizeEvents(sinceDays = DEFAULT_DAYS): Promise<EventSummary> {
  const days = Math.min(Math.max(Math.floor(sinceDays), 1), MAX_DAYS)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const counts = await eventRepository.countsSince(since)
  const total = counts.reduce((sum, c) => sum + c.count, 0)
  return { sinceDays: days, total, counts }
}
