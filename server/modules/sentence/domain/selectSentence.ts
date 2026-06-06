// Pure, side-effect-free sentence picker over the shared corpus slice + this user's exposure
// ledger. Epic 20 shipped the simplest policy — prefer unseen, else least-recently-seen. Epic 21
// turns it into a tunable, weighted *review* policy (the "sliding scale"): while fresh material is
// plentiful it still drains the corpus in order, but once unseen sentences run scarce it resurfaces
// seen ones — weighting them by time-since-last-seen, recent mistakes, struggling categories, and
// struggling words so the learner re-encounters exactly the material they're weakest on. Every knob
// lives in `SelectionWeights` so the scale is tuned without touching serving code.

import type { WordToken } from '../../../../shared/languages'

// The corpus fields the picker needs. `createdAt` orders unseen candidates so the corpus drains in
// insertion order; `theme` keys same-category review; `lemmas` (the sentence's normalized
// dictionary words) key word-level review against the user's struggling-lexeme signal.
export interface CorpusCandidate {
  id: string
  createdAt: Date
  theme: string | null
  lemmas: string[]
}

// One row of the user's exposure ledger for the slice.
export interface Exposure {
  sentenceId: string
  seenCount: number
  lastSeenAt: Date
}

// The tunable "sliding scale". Defaults strongly prefer fresh material and only resurface a seen
// sentence when the review signal is genuinely strong (a recent mistake plus recency, a struggling
// category, or a word the user keeps missing); raise the review weights to drill harder, lower them
// to keep marching through new sentences.
export interface SelectionWeights {
  // Serve unseen outright while at least this many remain unseen for the user (drain mode). Below
  // it the picker enters review mode and seen sentences can be resurfaced.
  reviewWhenUnseenBelow: number
  // The flat review score an unseen candidate carries in review mode — the bar a seen sentence must
  // clear to be resurfaced ahead of fresh material. Keep it above any single weak signal (so a
  // merely-old or freshly-missed sentence never preempts unseen) and below combined signals (so
  // genuine review can).
  unseenBase: number
  // Seen-sentence review weights:
  recency: number // time since last seen, normalized 0..1 across the seen set (oldest → 1)
  mistake: number // the user recently got this exact sentence wrong
  category: number // the sentence's theme is one the user is currently struggling with (× 0..1)
  lexeme: number // the sentence contains a word the user keeps missing, by lifetime stats (× 0..1)
}

export const DEFAULT_WEIGHTS: SelectionWeights = {
  reviewWhenUnseenBelow: 3,
  unseenBase: 2,
  recency: 1,
  mistake: 1.5,
  category: 1.5,
  lexeme: 1.5,
}

// The per-request review signal, derived from the user's recent attempts + lifetime word stats (see
// `buildReviewSignal`). Kept as plain sets/maps so the picker stays pure and trivially testable.
export interface ReviewSignal {
  // Corpus sentences the user recently got wrong — the strongest resurface candidates.
  mistakeSentenceIds: ReadonlySet<string>
  // Themes the user is currently struggling with → struggle weight in 0..1 (share of recent
  // attempts in that theme that were wrong). A seen sentence whose theme is here is nudged up for
  // same-category review.
  strugglingThemes: ReadonlyMap<string, number>
  // Lemmas the user struggles with → struggle weight in 0..1 (lifetime error rate from
  // `lexeme_stats`). A seen sentence containing one is nudged up for word-level review — drill the
  // words you keep missing, regardless of which sentence or theme they show up in.
  strugglingLexemes: ReadonlyMap<string, number>
}

export const EMPTY_SIGNAL: ReviewSignal = {
  mistakeSentenceIds: new Set(),
  strugglingThemes: new Map(),
  strugglingLexemes: new Map(),
}

// Returns the id of the next sentence to serve, or `null` if the corpus slice is empty.
export function selectNext(
  candidates: CorpusCandidate[],
  exposures: Exposure[],
  signal: ReviewSignal = EMPTY_SIGNAL,
  weights: SelectionWeights = DEFAULT_WEIGHTS
): string | null {
  if (candidates.length === 0) return null

  const lastSeenById = new Map(exposures.map((e) => [e.sentenceId, e.lastSeenAt.getTime()]))
  const unseen = candidates.filter((c) => !lastSeenById.has(c.id))

  // Drain mode: plenty of fresh material → serve the oldest-inserted unseen sentence.
  if (unseen.length >= weights.reviewWhenUnseenBelow) return oldestUnseen(unseen)

  // Review mode: unseen are scarce. Score the seen sentences and resurface the best one only if it
  // clears the flat unseen baseline; otherwise keep draining the remaining fresh material. With no
  // unseen left, the best-scoring seen sentence is always served (LRU is the floor when there's no
  // mistake/category/lexeme signal).
  const seen = candidates.filter((c) => lastSeenById.has(c.id))
  const bestSeen = bestSeenCandidate(seen, lastSeenById, signal, weights)
  if (unseen.length > 0) {
    return bestSeen && bestSeen.score > weights.unseenBase ? bestSeen.id : oldestUnseen(unseen)
  }
  return bestSeen ? bestSeen.id : null
}

function oldestUnseen(unseen: CorpusCandidate[]): string {
  return unseen.reduce((a, b) => (a.createdAt.getTime() <= b.createdAt.getTime() ? a : b)).id
}

interface ScoredSeen {
  id: string
  score: number
  lastSeen: number
}

// Pick the highest-scoring seen sentence to resurface. Recency is normalized across the seen set so
// it stays in 0..1 and the discrete mistake/category/lexeme bonuses remain comparable to it. Ties
// break toward the least-recently-seen sentence (so an unsignalled set degrades to plain LRU).
function bestSeenCandidate(
  seen: CorpusCandidate[],
  lastSeenById: Map<string, number>,
  signal: ReviewSignal,
  weights: SelectionWeights
): ScoredSeen | null {
  if (seen.length === 0) return null
  const times = seen.map((c) => lastSeenById.get(c.id) ?? 0)
  const max = Math.max(...times)
  const min = Math.min(...times)
  const span = max - min || 1

  let best: ScoredSeen | null = null
  for (const c of seen) {
    const last = lastSeenById.get(c.id) ?? 0
    const recencyNorm = (max - last) / span // least-recently-seen → 1
    const mistakeHit = signal.mistakeSentenceIds.has(c.id) ? 1 : 0
    const struggle = c.theme ? (signal.strugglingThemes.get(c.theme) ?? 0) : 0
    const lexemeStruggle = maxLexemeStruggle(c.lemmas, signal.strugglingLexemes)
    const score =
      weights.recency * recencyNorm +
      weights.mistake * mistakeHit +
      weights.category * struggle +
      weights.lexeme * lexemeStruggle
    if (best === null || score > best.score || (score === best.score && last < best.lastSeen)) {
      best = { id: c.id, score, lastSeen: last }
    }
  }
  return best
}

// A sentence's word-level struggle = its hardest word: the highest struggle weight among the lemmas
// it contains that the user is weak on (0 if none). "Hardest word", not the sum, so a sentence isn't
// rewarded merely for being long.
function maxLexemeStruggle(lemmas: string[], struggling: ReadonlyMap<string, number>): number {
  let best = 0
  for (const lemma of lemmas) {
    const w = struggling.get(lemma)
    if (w !== undefined && w > best) best = w
  }
  return best
}

// Count of corpus sentences this user has never been shown — the refill signal (drops below a
// threshold → top up the corpus in the background) and the gate for entering review mode.
export function unseenCount(candidates: CorpusCandidate[], exposures: Exposure[]): number {
  const seen = new Set(exposures.map((e) => e.sentenceId))
  return candidates.reduce((n, c) => (seen.has(c.id) ? n : n + 1), 0)
}

// Normalize a lemma to the same NFC + lowercase form `lexeme_stats` is written in (palabradex
// `computeSeenDeltas`), so corpus lemmas and the struggle map key off the same string.
export function normalizeLemma(s: string): string {
  return s.normalize('NFC').toLowerCase().trim()
}

// Unique normalized lemmas of a corpus sentence — the words it would drill, matched against the
// user's struggling-lexeme signal. Carried on `CorpusCandidate.lemmas`.
export function lemmasOf(wordBreakdown: WordToken[] | null | undefined): string[] {
  if (!wordBreakdown) return []
  const out = new Set<string>()
  for (const token of wordBreakdown) {
    const lemma = normalizeLemma(token.lemma ?? '')
    if (lemma) out.add(lemma)
  }
  return [...out]
}

// One recent graded attempt, reduced to just the fields the review signal needs. `theme` is the
// category of the sentence that attempt was on (joined from the corpus; null if the sentence was
// pruned or never corpus'd).
export interface AttemptSignal {
  sentenceId: string | null
  theme: string | null
  isCorrect: boolean
}

// One lemma's lifetime stats from `lexeme_stats`, reduced to the fields the review signal needs.
export interface LexemeSignal {
  lemma: string
  correctCount: number
  incorrectCount: number
}

// The raw per-user inputs `buildReviewSignal` folds into a `ReviewSignal`. `lexemes` is optional so
// callers that only have the recent-attempt slice can still build a (theme + mistake) signal.
export interface ReviewInputs {
  attempts: AttemptSignal[]
  lexemes?: LexemeSignal[]
}

export interface SignalOptions {
  // A theme only counts as "struggling" once at least this many of the user's recent attempts in it
  // were wrong — avoids over-reacting to a single slip.
  minThemeMisses?: number
  // A lemma only counts as "struggling" once it has at least this many lifetime incorrect attempts.
  minLexemeMisses?: number
}

// Pure: fold the user's recent attempts + lifetime word stats into a `ReviewSignal`. Wrong attempts
// contribute their sentence id (resurface-the-exact-miss) and tally per-theme misses; a theme
// crossing the miss threshold becomes a struggling category weighted by wrong-share. Lemmas with
// enough lifetime misses become struggling words weighted by their error rate.
export function buildReviewSignal(inputs: ReviewInputs, options: SignalOptions = {}): ReviewSignal {
  const minThemeMisses = options.minThemeMisses ?? 2
  const minLexemeMisses = options.minLexemeMisses ?? 2
  const mistakeSentenceIds = new Set<string>()
  const themeTally = new Map<string, { wrong: number; total: number }>()

  for (const a of inputs.attempts) {
    if (a.sentenceId && !a.isCorrect) mistakeSentenceIds.add(a.sentenceId)
    if (a.theme) {
      const tally = themeTally.get(a.theme) ?? { wrong: 0, total: 0 }
      tally.total += 1
      if (!a.isCorrect) tally.wrong += 1
      themeTally.set(a.theme, tally)
    }
  }

  const strugglingThemes = new Map<string, number>()
  for (const [theme, { wrong, total }] of themeTally) {
    if (wrong >= minThemeMisses) strugglingThemes.set(theme, wrong / total)
  }

  const strugglingLexemes = new Map<string, number>()
  for (const l of inputs.lexemes ?? []) {
    const total = l.correctCount + l.incorrectCount
    if (l.incorrectCount >= minLexemeMisses && total > 0) {
      strugglingLexemes.set(normalizeLemma(l.lemma), l.incorrectCount / total)
    }
  }

  return { mistakeSentenceIds, strugglingThemes, strugglingLexemes }
}
