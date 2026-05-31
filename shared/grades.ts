// Letter-grade bands derived from a 0–100 score. A+ = perfect and natural;
// A = accurate (may be stiff); B/C/D/F = declining correctness by word %.
// scoreToGrade is the single source of truth for both display and DB snapshot.

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

// Band thresholds (inclusive lower bound):
//   A+  97–100   B  80–89
//   A   90–96    C  65–79
//                D  50–64
//                F   0–49
const BANDS: [number, Grade][] = [
  [97, 'A+'],
  [90, 'A'],
  [80, 'B'],
  [65, 'C'],
  [50, 'D'],
]

export function scoreToGrade(score: number): Grade {
  for (const [threshold, grade] of BANDS) {
    if (score >= threshold) return grade
  }
  return 'F'
}
