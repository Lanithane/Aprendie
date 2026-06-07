// Pure, side-effect-free card picker. Mirrors the sentence `selectNext` philosophy:
// drain unseen first (oldest-inserted order), then resurface seen cards weighted by
// struggle rate (incorrectCount / total) and recency. Uses `lexeme_stats` rows directly —
// no extra per-flashcard ledger — so flashcard practice and sentence practice share one
// mastery model in Palabradex.

export interface CardCandidate {
  id: string
  lemma: string
  createdAt: Date
}

export interface CardStat {
  // Normalised NFC-lowercased lemma, matching the key written by palabradexRepository.
  lemma: string
  seenCount: number
  correctCount: number
  incorrectCount: number
  lastSeenAt: Date
}

// Normalise a lemma to the same form palabradex uses, so lookup keys match.
function normalise(s: string): string {
  return s.normalize('NFC').toLowerCase().trim()
}

// Returns the id of the next card to show, or `null` if the deck is empty.
// `recentLemmas` is the set of normalised lemmas served in the last N cards (cooldown)
// derived from lexeme_stats lastSeenAt ordering in the caller.
export function selectNextFlashcard(
  candidates: CardCandidate[],
  stats: CardStat[],
  recentLemmas: ReadonlySet<string>
): string | null {
  if (candidates.length === 0) return null

  // Cooldown: skip the most-recently-seen cards (up to 3), but always leave at least one
  // eligible so the learner is never stranded.
  const cooldown = Math.min(3, candidates.length - 1)
  const eligible =
    cooldown > 0 ? candidates.filter((c) => !recentLemmas.has(normalise(c.lemma))) : candidates
  const pool = eligible.length > 0 ? eligible : candidates

  const statsByLemma = new Map(stats.map((s) => [normalise(s.lemma), s]))
  const unseen = pool.filter((c) => !statsByLemma.has(normalise(c.lemma)))

  // Drain mode: serve the oldest-inserted unseen card.
  if (unseen.length > 0) {
    return unseen.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b)).id
  }

  // All seen: score by struggle rate (2×) + recency (1×). Ties break toward least-recently-seen.
  const times = pool.map((c) => statsByLemma.get(normalise(c.lemma))?.lastSeenAt.getTime() ?? 0)
  const maxTime = Math.max(...times)
  const minTime = Math.min(...times)
  const span = maxTime - minTime || 1

  let best: { id: string; score: number; lastSeen: number } | null = null
  for (const c of pool) {
    const stat = statsByLemma.get(normalise(c.lemma))
    if (!stat) continue
    const lastSeen = stat.lastSeenAt.getTime()
    const recency = (maxTime - lastSeen) / span // oldest → 1
    const total = stat.correctCount + stat.incorrectCount
    const struggle = total > 0 ? stat.incorrectCount / total : 0
    const score = recency + 2 * struggle
    if (!best || score > best.score || (score === best.score && lastSeen < best.lastSeen)) {
      best = { id: c.id, score, lastSeen }
    }
  }
  return best?.id ?? pool[0].id
}
