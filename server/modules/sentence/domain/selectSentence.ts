// Pure, side-effect-free sentence picker over the shared corpus slice + this user's exposure
// ledger. Epic 20 ships the simplest sensible policy — **prefer an unseen sentence, else resurface
// the least-recently-seen one** — behind this `selectNext()` seam so Epic 21 can swap the body for
// a tunable, weighted review policy without touching the serving code.

// The corpus fields the picker needs. `createdAt` orders unseen candidates so the corpus drains in
// insertion order; `theme` is unused today but carried for Epic 21's same-category review.
export interface CorpusCandidate {
  id: string
  createdAt: Date
  theme: string | null
}

// One row of the user's exposure ledger for the slice.
export interface Exposure {
  sentenceId: string
  seenCount: number
  lastSeenAt: Date
}

// Returns the id of the next sentence to serve, or `null` if the corpus slice is empty.
export function selectNext(candidates: CorpusCandidate[], exposures: Exposure[]): string | null {
  if (candidates.length === 0) return null

  const lastSeenById = new Map(exposures.map((e) => [e.sentenceId, e.lastSeenAt.getTime()]))

  // Prefer unseen: oldest-inserted first, so the corpus is consumed in generation order.
  const unseen = candidates.filter((c) => !lastSeenById.has(c.id))
  if (unseen.length > 0) {
    return unseen.reduce((a, b) => (a.createdAt.getTime() <= b.createdAt.getTime() ? a : b)).id
  }

  // Everything seen — resurface the least-recently-seen sentence for review.
  return candidates.reduce((a, b) =>
    (lastSeenById.get(a.id) ?? 0) <= (lastSeenById.get(b.id) ?? 0) ? a : b
  ).id
}

// Count of corpus sentences this user has never been shown — the refill signal (drops below a
// threshold → top up the corpus in the background).
export function unseenCount(candidates: CorpusCandidate[], exposures: Exposure[]): number {
  const seen = new Set(exposures.map((e) => e.sentenceId))
  return candidates.reduce((n, c) => (seen.has(c.id) ? n : n + 1), 0)
}
