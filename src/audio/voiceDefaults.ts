// Smart default voices for the Web Speech API.
//
// Browsers expose wildly different voice inventories per OS/browser, and several default to a flat,
// robotic voice even when a far better one for the locale is installed. When the learner hasn't
// pinned a voice in VoicePicker, useSpeech.pickVoice() asks bestDefaultVoice() to choose, nudging
// selection toward the consistently better-sounding voices we found per platform (research,
// 2026-05):
//
//   • Apple (macOS / iOS, Safari & Chrome): named voices, with "(Enhanced)"/"(Premium)" variants
//       best — es Mónica/Paulina, en Samantha/Daniel, fr Amélie/Thomas, de Anna, it Alice,
//       pt Luciana. Apple also ships gimmicky "novelty" character voices (Eddy, Reed, Flo, Albert,
//       …) for many locales; those are demoted so they never win by default.
//   • Windows / Edge: the "Microsoft … Online (Natural)" neural voices (Elvira, Dalia, Aria, …)
//       are dramatically better than the legacy SAPI voices (Sabina, Helena, David).
//   • Android / Chrome OS / desktop Chrome: the network-backed "Google <language>" voices.
//
// Selection is a score: locale specificity dominates (an exact es-MX voice still beats an es-ES
// one, preserving the learner's dialect), then a named-voice preference list, then generic quality
// markers — so even an unlisted voice labelled "Natural"/"Enhanced" outranks a plain one. The
// per-tier bonuses are intentionally small relative to the locale gap, so quality never overrides
// dialect.

// Named voices to prefer per base language, best first (matched as a case-insensitive substring).
export const PREFERRED_VOICES: Record<string, readonly string[]> = {
  es: ['mónica', 'monica', 'paulina', 'elvira', 'dalia', 'google español'],
  en: ['samantha', 'aria', 'jenny', 'guy', 'daniel', 'google us english', 'google uk english'],
  fr: ['amélie', 'amelie', 'thomas', 'denise', 'google français'],
  de: ['anna', 'katja', 'conrad', 'google deutsch'],
  it: ['alice', 'elsa', 'diego', 'google italiano'],
  pt: ['luciana', 'joana', 'francisca', 'google português'],
}

// Generic, cross-platform name markers that signal a higher-tier voice, best first.
export const QUALITY_MARKERS: readonly string[] = [
  'neural',
  'natural',
  'premium',
  'enhanced',
  'online',
  'google',
]

// Apple novelty / character voices: they speak the locale but sound gimmicky, so push them below
// every "real" voice. They can still be returned when they're the only option for the language.
export const NOVELTY_MARKERS: readonly string[] = [
  'albert',
  'bad news',
  'bahh',
  'bells',
  'boing',
  'bubbles',
  'cellos',
  'eddy',
  'flo',
  'fred',
  'good news',
  'grandma',
  'grandpa',
  'jester',
  'junior',
  'organ',
  'ralph',
  'reed',
  'rocko',
  'sandy',
  'shelley',
  'superstar',
  'trinoids',
  'whisper',
  'wishing well',
  'wobble',
  'zarvox',
]

// Index of the first matching needle (the caller uses it as a rank), or -1 when none match.
function firstMatch(haystack: string, needles: readonly string[]): number {
  return needles.findIndex((n) => haystack.includes(n))
}

// Scores one voice for a target locale. Higher is better; see the module comment for the tiers.
function scoreVoice(voice: SpeechSynthesisVoice, target: string, base: string): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  let score = 0
  // Locale specificity dominates: exact (es-MX) beats a sibling dialect (es-*) beats bare base.
  if (lang === target) score += 100
  else if (lang.startsWith(`${base}-`)) score += 10
  // Named-voice preference: earlier in the list scores higher.
  const named = PREFERRED_VOICES[base] ?? []
  const nameIdx = firstMatch(name, named)
  if (nameIdx !== -1) score += named.length - nameIdx
  // Generic quality markers (Natural/Enhanced/Google/…): a softer nudge than the named list.
  const markerIdx = firstMatch(name, QUALITY_MARKERS)
  if (markerIdx !== -1) score += QUALITY_MARKERS.length - markerIdx
  // Demote novelty voices below anything else in the same locale tier.
  if (firstMatch(name, NOVELTY_MARKERS) !== -1) score -= 1000
  // Final tiebreak: the browser's own default voice for the language.
  if (voice.default) score += 0.5
  return score
}

// Picks the best default voice from `candidates` (already filtered to the target language) for the
// given BCP-47 `locale`, or undefined when the list is empty (caller defers to the browser).
export function bestDefaultVoice(
  candidates: SpeechSynthesisVoice[],
  locale: string
): SpeechSynthesisVoice | undefined {
  if (candidates.length === 0) return undefined
  const target = locale.toLowerCase()
  const base = target.split('-')[0]
  let best: SpeechSynthesisVoice | undefined
  let bestScore = -Infinity
  for (const voice of candidates) {
    const score = scoreVoice(voice, target, base)
    if (score > bestScore) {
      bestScore = score
      best = voice
    }
  }
  return best
}
