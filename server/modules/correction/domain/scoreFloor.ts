import type { CorrectionMistake } from './Correction'

// Deterministic backstop for the agreed product rule: only an essentially
// entirely-wrong answer may land in the F band (score < 50). The grading model
// is told this in its prompt, but it sometimes disobeys and drops a mostly-right
// answer below 50 anyway. This guard floors such answers out of F so the letter
// grade can't contradict the rule.
//
// The signal is the share of the corrected answer's words that the model itself
// flagged as mistakes. Only an answer that is at least 90% wrong may stay in the
// F band; anything the learner got more than 10% of is lifted above F, scaling
// with how much of the sentence they conveyed so the grade reflects "I only got a
// couple of words wrong". The lift is capped at C, never higher — when the model
// itself scored an answer into the F band it saw real errors (e.g. two wrong
// words that flip the meaning), so the floor must not manufacture an A/B.

const F_CEILING = 49 // top of the F band; a guarded score is lifted above this
const FLOOR_CEILING = 79 // a floor can lift at most into C; the model owns A/B
const F_WRONG_SHARE = 0.9 // only a >=90%-wrong answer may stay in the F band

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)

// Fraction of the corrected answer's words covered by mistake phrases (0–1).
// Clamped to 1 so overlapping/duplicated mistake phrases can't exceed the whole.
export function mistakeWordShare(correctedAnswer: string, mistakes: CorrectionMistake[]): number {
  const total = words(correctedAnswer).length
  if (total === 0) return 1
  const wrong = mistakes.reduce((sum, m) => sum + words(m.correctPhrase).length, 0)
  return Math.min(wrong, total) / total
}

// Raise a model score out of the F band unless the answer is >=90% wrong, scaling
// the floor to the share of words the learner got right. Only ever lifts
// (Math.max), only acts on F-band scores, and tops out at C — so a fair model
// score is left intact and a genuinely almost-entirely-wrong answer stays in F.
export function applyScoreFloor(
  score: number,
  correctedAnswer: string,
  mistakes: CorrectionMistake[]
): number {
  if (score > F_CEILING) return score
  const wrongShare = mistakeWordShare(correctedAnswer, mistakes)
  if (wrongShare >= F_WRONG_SHARE) return score // almost entirely wrong stays in F
  // Linearly map the conveyed share above the F cutoff onto the D–C band: a learner
  // just past 10% correct lands at D (50), a fully-conveyed answer at C (79).
  const conveyed = (1 - wrongShare - (1 - F_WRONG_SHARE)) / F_WRONG_SHARE
  const floor = Math.round(F_CEILING + 1 + conveyed * (FLOOR_CEILING - (F_CEILING + 1)))
  return Math.max(score, floor)
}
