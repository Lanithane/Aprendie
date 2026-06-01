// Allowed event names — a small closed set keeps the `events` table tidy and the admin
// summary meaningful. Add new names here as they're instrumented.
export const EVENT_NAMES = ['sentence_shown', 'guess_submitted', 'grade_received'] as const
export type EventName = (typeof EVENT_NAMES)[number]

export function isEventName(name: string): name is EventName {
  return (EVENT_NAMES as readonly string[]).includes(name)
}

// A single bucket in the admin analytics summary: how many of each event name fired in the
// window, plus the distinct accounts that triggered it.
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
