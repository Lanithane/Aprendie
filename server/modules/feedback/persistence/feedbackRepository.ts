import { desc, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import {
  feedback,
  users,
  type FeedbackRow,
  type NewFeedbackRow,
} from '../../../infrastructure/db/schema'

export async function insert(row: NewFeedbackRow): Promise<FeedbackRow> {
  const inserted = await db.insert(feedback).values(row).returning()
  return inserted[0]
}

export interface FeedbackWithUser {
  feedback: FeedbackRow
  user: { name: string | null; email: string | null } | null
}

// Newest-first list for the admin inbox, joined to the author (left join so a feedback row
// whose user was deleted — shouldn't happen given the cascade, but be safe — still lists).
export async function listRecent(limit: number): Promise<FeedbackWithUser[]> {
  const rows = await db
    .select({
      feedback,
      userName: users.name,
      userEmail: users.email,
    })
    .from(feedback)
    .leftJoin(users, eq(feedback.userId, users.id))
    .orderBy(desc(feedback.createdAt))
    .limit(limit)
  return rows.map((r) => ({
    feedback: r.feedback,
    user: r.userEmail ? { name: r.userName, email: r.userEmail } : null,
  }))
}
