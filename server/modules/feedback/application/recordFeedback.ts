import * as feedbackRepository from '../persistence/feedbackRepository'
import { toFeedbackView, type FeedbackCategory, type FeedbackView } from '../domain/Feedback'

export interface RecordFeedbackInput {
  userId: string
  category: FeedbackCategory
  message: string
  page?: string | null
  userAgent?: string | null
}

export async function recordFeedback(input: RecordFeedbackInput): Promise<FeedbackView> {
  const row = await feedbackRepository.insert({
    userId: input.userId,
    category: input.category,
    message: input.message,
    page: input.page ?? null,
    userAgent: input.userAgent ?? null,
  })
  return toFeedbackView(row)
}
