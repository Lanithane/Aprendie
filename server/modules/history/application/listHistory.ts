import * as historyRepository from '../persistence/historyRepository'
import type { PairFilter } from '../persistence/historyRepository'
import { toAttemptView, type AttemptView } from '../domain/Attempt'
import type { LanguagePair } from '../../../../shared/languages'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export interface ListHistoryParams {
  pair?: PairFilter
  level?: string
  sort?: 'newest' | 'worst'
  limit?: number
  cursor?: string
}

export interface HistoryPage {
  items: AttemptView[]
  nextCursor: string | null
}

// Opaque keyset cursor: base64("<sort>|<v1>|<id>").
// newest: v1 = ISO datetime; worst: v1 = integer score.
// Old two-part format "<createdAtISO>|<id>" is decoded as 'newest' for backwards compatibility.
function encodeCursor(view: AttemptView, sort: 'newest' | 'worst'): string {
  const payload =
    sort === 'worst' ? `worst|${view.score}|${view.id}` : `newest|${view.createdAt}|${view.id}`
  return Buffer.from(payload, 'utf8').toString('base64url')
}

function decodeCursor(raw: string): historyRepository.ListCursor | undefined {
  try {
    const parts = Buffer.from(raw, 'base64url').toString('utf8').split('|')
    if (parts.length === 2) {
      // Legacy format: <createdAt>|<id>
      const date = new Date(parts[0])
      if (!parts[1] || Number.isNaN(date.getTime())) return undefined
      return { sort: 'newest', createdAt: date, id: parts[1] }
    }
    if (parts.length === 3) {
      const [sortTag, v1, id] = parts
      if (!id) return undefined
      if (sortTag === 'worst') {
        const score = parseInt(v1, 10)
        if (Number.isNaN(score)) return undefined
        return { sort: 'worst', score, id }
      }
      const date = new Date(v1)
      if (Number.isNaN(date.getTime())) return undefined
      return { sort: 'newest', createdAt: date, id }
    }
    return undefined
  } catch {
    return undefined
  }
}

export async function listHistory(userId: string, params: ListHistoryParams): Promise<HistoryPage> {
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const sort = params.sort ?? 'newest'
  const rows = await historyRepository.listForUser(userId, {
    pair: params.pair,
    level: params.level,
    sort,
    limit: limit + 1, // fetch one extra to detect a next page
    cursor: params.cursor ? decodeCursor(params.cursor) : undefined,
  })
  const hasMore = rows.length > limit
  const items = rows.slice(0, limit).map(toAttemptView)
  const nextCursor =
    hasMore && items.length > 0 ? encodeCursor(items[items.length - 1], sort) : null
  return { items, nextCursor }
}

export async function getHistoryEntry(userId: string, id: string): Promise<AttemptView | null> {
  const row = await historyRepository.getByIdForUser(userId, id)
  return row ? toAttemptView(row) : null
}

export async function listDistinctPairs(userId: string): Promise<LanguagePair[]> {
  const rows = await historyRepository.distinctPairsForUser(userId)
  return rows as LanguagePair[]
}
