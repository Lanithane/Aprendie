import type { Grade } from '../../../shared/grades'

// Result-headline copy. The shown title varies by the grade received and whether the answer was
// marked correct (success) or had mistakes — 10 variations each so the same screen rarely reads the
// same twice. grade and isCorrect arrive as independent fields from the grader, so every combination
// is possible (if rare at the extremes); the tone scales with the grade. An exact match short-circuits
// to a dedicated "Perfect!" celebration in CorrectionDisplay, ahead of this table.
export const RESULT_TITLES: Record<Grade, { success: string[]; mistake: string[] }> = {
  'A+': {
    success: [
      'Flawless!',
      'Perfect!',
      'Nailed it!',
      'Pure gold!',
      "Couldn't be better!",
      'Masterful!',
      'Spot on!',
      'Brilliant!',
      'This is the way.',
    ],
    mistake: ['So close!', 'Nearly perfect!', 'Almost there!'],
  },
  A: {
    success: ['Excellent!', 'Well done!', 'Great work!', 'Impressive!'],
    mistake: ['So close!', 'Great try', 'Not quite!'],
  },
  B: {
    success: ['Nice work!', 'Well done!', 'Good job!', 'Keep it up!', 'Almost there!'],
    mistake: [
      "Close! Here's what to fix",
      'Almost there!',
      'Nearly there!',
      "You're on the right track",
      'Good effort!',
    ],
  },
  C: {
    success: ['Good effort!', 'Not bad!', "You're getting it!", 'Making progress!', 'Keep going!'],
    mistake: ['On the right track', 'Keep at it!', 'Progress!', 'Keep practicing!'],
  },
  D: {
    success: ['Keep at it!', "Don't give up!", 'Hang in there!', 'Keep pushing!'],
    mistake: ['On the right track', 'Keep at it!', 'Progress!', 'Keep practicing!'],
  },
  F: {
    success: ["Don't give up!", 'Keep at it!'],
    mistake: ['On the right track', 'Keep at it!', 'Progress!', 'Keep practicing!'],
  },
}

// Small deterministic string hash → stable index into a title pool for a given answer. Keeps the
// chosen headline stable across re-renders (no flicker while mistakes/notes stream in) yet varies
// sentence to sentence.
export const pickTitle = (pool: string[], seed: string) => {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return pool[Math.abs(hash) % pool.length]
}
