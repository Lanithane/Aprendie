import { gte, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import { events, type NewEventRow } from '../../../infrastructure/db/schema'
import type { EventCount } from '../domain/Event'

export async function insert(row: NewEventRow): Promise<void> {
  await db.insert(events).values(row)
}

// Per-name counts (and distinct users) for events since `since`, busiest first.
export async function countsSince(since: Date): Promise<EventCount[]> {
  const rows = await db
    .select({
      name: events.name,
      count: sql<number>`count(*)::int`,
      users: sql<number>`count(distinct ${events.userId})::int`,
    })
    .from(events)
    .where(gte(events.createdAt, since))
    .groupBy(events.name)
    .orderBy(sql`count(*) desc`)
  return rows
}
