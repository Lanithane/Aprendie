import { and, eq, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import { usageDaily } from '../../../infrastructure/db/schema'

// UTC calendar day ('YYYY-MM-DD') — a timezone-stable bucket for the daily cap.
export function utcDay(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function countToday(userId: string): Promise<number> {
  const rows = await db
    .select({ count: usageDaily.count })
    .from(usageDaily)
    .where(and(eq(usageDaily.userId, userId), eq(usageDaily.day, utcDay())))
  return rows[0]?.count ?? 0
}

// Atomically increment (or seed) today's counter and return the new total.
export async function incrementToday(userId: string): Promise<number> {
  const rows = await db
    .insert(usageDaily)
    .values({ userId, day: utcDay(), count: 1 })
    .onConflictDoUpdate({
      target: [usageDaily.userId, usageDaily.day],
      set: { count: sql`${usageDaily.count} + 1` },
    })
    .returning({ count: usageDaily.count })
  return rows[0].count
}
