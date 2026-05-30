// Maps a 0–100 correction score to a semantic MUI palette color.
// success (teal) ≥ 80, warning (amber) ≥ 50, error below. These remap to
// on-palette MD3 tokens in the theme, so they stay theme-agnostic.
export type ScoreColor = 'success' | 'warning' | 'error'

export function scoreColor(score: number): ScoreColor {
  if (score >= 80) return 'success'
  if (score >= 50) return 'warning'
  return 'error'
}
