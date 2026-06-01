import { api } from './client'

export type EventName = 'sentence_shown' | 'guess_submitted' | 'grade_received'

// Admin analytics summary, mirrored from the server's `EventSummary`.
export interface EventCount {
  name: string
  count: number
  users: number
}

export interface EventSummary {
  sinceDays: number
  total: number
  counts: EventCount[]
}

// Fire-and-forget client event. Never throws and never blocks the caller: analytics must
// not interfere with the action being measured, so a failed POST is swallowed.
export function trackEvent(name: EventName, props?: Record<string, unknown>): void {
  void api('/api/events', {
    method: 'POST',
    body: JSON.stringify({ name, props }),
  }).catch(() => {
    // Swallow — analytics is best-effort.
  })
}

export function fetchEventSummary(days?: number): Promise<EventSummary> {
  const qs = days ? `?days=${days}` : ''
  return api<EventSummary>(`/api/events/summary${qs}`)
}
