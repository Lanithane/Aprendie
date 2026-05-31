// Auto-speak preferences shared by client + server. Persisted per account
// (`users.auto_speak`, `users.auto_speak_delay_ms`); a null/unset column falls back to these
// defaults on read, so a brand-new account gets auto-speak on with a short delay. The delay
// bounds are enforced both ends — the client clamps the slider, the server validates the PATCH.
export const AUTO_SPEAK_DEFAULT = true
export const AUTO_SPEAK_DELAY_DEFAULT_MS = 500
export const AUTO_SPEAK_DELAY_MIN_MS = 0
export const AUTO_SPEAK_DELAY_MAX_MS = 3000

export function clampAutoSpeakDelay(ms: number): number {
  return Math.min(AUTO_SPEAK_DELAY_MAX_MS, Math.max(AUTO_SPEAK_DELAY_MIN_MS, ms))
}
