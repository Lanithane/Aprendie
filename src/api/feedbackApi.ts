import { api } from './client'

export const FEEDBACK_CATEGORIES = ['idea', 'bug', 'praise', 'other'] as const
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

export interface FeedbackInput {
  category: FeedbackCategory
  message: string
  // The in-app path the user was on when they sent it (captured by the dialog).
  page?: string
}

// Admin inbox row, mirrored from the server's `FeedbackView`.
export interface Feedback {
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

export function submitFeedback(input: FeedbackInput): Promise<Feedback> {
  return api<Feedback>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function fetchFeedback(limit?: number): Promise<Feedback[]> {
  const qs = limit ? `?limit=${limit}` : ''
  return api<Feedback[]>(`/api/feedback${qs}`)
}
