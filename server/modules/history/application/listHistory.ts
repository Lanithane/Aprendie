import * as historyRepository from '../persistence/historyRepository'
import type { PairFilter, ListCursor } from '../persistence/historyRepository'
import { toAttemptView, type AttemptView } from '../domain/Attempt'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export interface ListHistoryParams {
  pair?: PairFilter
  limit?: number
  cursor?: string
}

export interface HistoryPage {
  items: AttemptView[]
  nextCursor: string | null
}

// Opaque keyset cursor: base64("<createdAtISO>|<id>").
function encodeCursor(view: AttemptView): string {
  return Buffer.from(`${view.createdAt}|${view.id}`, 'utf8').toString('base64url')
}

function decodeCursor(raw: string): ListCursor | undefined {
  try {
    const [createdAt, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|')
    const date = new Date(createdAt)
    if (!id || Number.isNaN(date.getTime())) return undefined
    return { createdAt: date, id }
  } catch {
    return undefined
  }
}

export async function listHistory(userId: string, params: ListHistoryParams): Promise<HistoryPage> {
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const rows = await historyRepository.listForUser(userId, {
    pair: params.pair,
    limit: limit + 1, // fetch one extra to detect a next page
    cursor: params.cursor ? decodeCursor(params.cursor) : undefined,
  })
  const hasMore = rows.length > limit
  const items = rows.slice(0, limit).map(toAttemptView)
  const nextCursor = hasMore && items.length > 0 ? encodeCursor(items[items.length - 1]) : null
  return { items, nextCursor }
}

export async function getHistoryEntry(userId: string, id: string): Promise<AttemptView | null> {
  const row = await historyRepository.getByIdForUser(userId, id)
  return row ? toAttemptView(row) : null
}
