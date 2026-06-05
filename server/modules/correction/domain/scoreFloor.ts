import type { CorrectionMistake } from './Correction'

// Deterministic backstop for the agreed product rule: only an essentially
// entirely-wrong answer may land in the F band (score < 50). The grading model
// is told this in its prompt, but it sometimes disobeys and drops a mostly-right
// answer below 50 anyway. This guard floors such answers out of F so the letter
// grade can't contradict the rule.
//
// The signal is the share of the corrected answer's words that the model itself
// flagged as mistakes: if fewer than half the words were wrong, the learner
// conveyed the majority of the sentence and it is not "entirely wrong".

const F_CEILING = 49 // top of the F band; floor lifts a guarded score to 50

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

// Raise a model score out of the F band when the answer is majority-correct.
// Leaves scores >= 50 untouched, and leaves genuinely mostly-wrong answers in F.
export function applyScoreFloor(
  score: number,
  correctedAnswer: string,
  mistakes: CorrectionMistake[]
): number {
  if (score > F_CEILING) return score
  return mistakeWordShare(correctedAnswer, mistakes) < 0.5 ? F_CEILING + 1 : score
}
