import * as feedbackRepository from '../persistence/feedbackRepository'
import { toFeedbackView, type FeedbackView } from '../domain/Feedback'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

// Admin inbox: the most recent feedback, author joined for display.
export async function listFeedback(limit = DEFAULT_LIMIT): Promise<FeedbackView[]> {
  const capped = Math.min(Math.max(limit, 1), MAX_LIMIT)
  const rows = await feedbackRepository.listRecent(capped)
  return rows.map((r) => toFeedbackView(r.feedback, r.user ?? undefined))
}
