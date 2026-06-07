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
      'Absolutely perfect!',
      'Masterful!',
      'Spot on, every word!',
      'Brilliant!',
      'This is the way.',
    ],
    mistake: [
      'So close!',
      'Nearly perfect!',
      'Almost untouchable!',
      'Practically flawless!',
      'Almost there!',
    ],
  },
  A: {
    success: [
      'Excellent!',
      'Well done!',
      'Great work!',
      'Strong answer!',
      'Beautifully done!',
      "You've got this!",
      'Sharp work!',
      'Top notch!',
      'Impressive!',
    ],
    mistake: ['So close!', 'Great try', 'Not quite!'],
  },
  B: {
    success: [
      'Nice work!',
      'Well done!',
      'Good job!',
      'Solid!',
      'Right on!',
      'Looking good!',
      'Keep it up!',
    ],
    mistake: [
      "Close! Here's what to fix",
      'Almost there!',
      'Good try, a few tweaks',
      'Nearly there!',
      'On the right track',
      'Solid start!',
      'Getting there!',
      'Good effort!',
    ],
  },
  C: {
    success: [
      'Good effort!',
      'Not bad!',
      "You're getting it!",
      'Decent work!',
      'Coming along!',
      'Making progress!',
      'Fair work!',
      'On your way!',
      'Keep going!',
    ],
    mistake: [
      "Good try! Let's tweak these",
      'On the right track',
      'Keep at it, check these',
      'Halfway there!',
      'A few things to fix',
      'Progress! Polish these',
      "Not quite, let's refine",
      'Close-ish, fix these',
    ],
  },
  D: {
    success: [
      'Keep at it!',
      'Progress!',
      'On your way!',
      "Don't give up!",
      'Step by step!',
      'Building it up!',
      'Hang in there!',
      'Coming together!',
      'Keep pushing!',
    ],
    mistake: [
      "Let's work through these",
      'Keep going, check these',
      'Room to grow, fix these',
      "Let's tidy these up",
      "Don't worry, fix these",
      "Let's polish this up",
      'Keep at it, refine these',
      'Worth another look',
    ],
  },
  F: {
    success: [
      'Every bit counts!',
      'Keep building!',
      'Onward!',
      "Don't give up!",
      'Step by step!',
      'Keep at it!',
      "Try again, you've got this!",
    ],
    mistake: [
      "Let's review this one",
      'Keep practicing!',
      "Let's break this down",
      "Don't worry, let's learn!",
      "Keep at it, you'll get there",
    ],
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
