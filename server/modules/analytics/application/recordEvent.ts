import * as eventRepository from '../persistence/eventRepository'
import type { EventName } from '../domain/Event'

export interface RecordEventInput {
  name: EventName
  userId?: string | null
  props?: Record<string, unknown> | null
}

// Persist one analytics event. Callers that aren't on a user-facing critical path (e.g. the
// sentence server firing `sentence_shown`) should wrap this in `recordEventSafe` so a logging
// failure never breaks the feature being measured.
export async function recordEvent(input: RecordEventInput): Promise<void> {
  await eventRepository.insert({
    name: input.name,
    userId: input.userId ?? null,
    props: input.props ?? null,
  })
}

// Best-effort variant: swallows + logs errors. Use from non-analytics flows that orchestrate
// this as a side effect so instrumentation can never take down the primary action.
export async function recordEventSafe(input: RecordEventInput): Promise<void> {
  try {
    await recordEvent(input)
  } catch (err) {
    console.error(`[analytics] recordEvent(${input.name}) failed:`, err)
  }
}
