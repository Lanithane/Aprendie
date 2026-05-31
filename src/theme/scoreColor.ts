// Maps a 0–100 correction score to a semantic MUI palette color.
// Thresholds align to grade bands: A+/A (≥90) success, B/C (≥65) warning, D/F error.
// These remap to on-palette MD3 tokens in the theme, so they stay theme-agnostic.
export type ScoreColor = 'success' | 'warning' | 'error'

export function scoreColor(score: number): ScoreColor {
  if (score >= 90) return 'success'
  if (score >= 65) return 'warning'
  return 'error'
}
