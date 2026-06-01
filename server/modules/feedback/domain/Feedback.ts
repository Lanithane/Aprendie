import type { FeedbackRow } from '../../../infrastructure/db/schema'

// The four feedback buckets. Loose-typed text in the DB; the client and controller
// constrain submissions to these.
export const FEEDBACK_CATEGORIES = ['idea', 'bug', 'praise', 'other'] as const
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

// Projected feedback row for the admin inbox. `userId` is kept so the admin can pivot to
// the account; name/email are joined in by the application layer for display.
export interface FeedbackView {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
  category: FeedbackCategory
  message: string
  page: string | null
  userAgent: string | null
  createdAt: string
}

export function toFeedbackView(
  row: FeedbackRow,
  user?: { name: string | null; email: string | null }
): FeedbackView {
  return {
    id: row.id,
    userId: row.userId,
    userName: user?.name ?? null,
    userEmail: user?.email ?? null,
    category: row.category,
    message: row.message,
    page: row.page,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
  }
}
