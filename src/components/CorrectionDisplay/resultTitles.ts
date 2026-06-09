// Result-headline copy now lives in the i18n catalog under `correction.resultTitles.<grade>`
// (read via `t(..., { returnObjects: true })` in CorrectionDisplay) so it localizes with the UI.
// Each grade carries a `success` and a `mistake` pool of varied phrasings — grade and isCorrect
// arrive as independent fields from the grader, so every combination is possible; the tone scales
// with the grade. An exact match short-circuits to the dedicated "Perfect!" celebration ahead of
// this table.

// Small deterministic string hash → stable index into a title pool for a given answer. Keeps the
// chosen headline stable across re-renders (no flicker while mistakes/notes stream in) yet varies
// sentence to sentence.
export const pickTitle = (pool: string[], seed: string) => {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return pool[Math.abs(hash) % pool.length]
}
