import type { WordToken } from '../../../../shared/languages'

// Mirrors the correction `Mistake` shape; kept local so the domain layer stays
// free of cross-module imports (same pattern as history's `AttemptMistake`).
export interface SeenMistake {
  sourceText: string
}

// One root's aggregated deltas for a single attempt.
export interface LexemeDelta {
  lemma: string
  partOfSpeech: string
  seen: number
  correct: number
  incorrect: number
}

// One variant (inflected surface) delta for a single attempt.
export interface VariantDelta {
  lemma: string
  surface: string
  seen: number
}

export interface SeenWordsDeltas {
  lexemes: LexemeDelta[]
  variants: VariantDelta[]
}

// Word run = one or more letters/marks, allowing internal apostrophes or hyphens — the same
// rule the frontend tokenizer uses (src/components/SentenceTokens/tokenize.ts), reimplemented
// here so the server domain layer carries no `src/` dependency.
const WORD_RE = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu

const normalize = (s: string) => s.normalize('NFC').toLowerCase().trim()

// Surface strings from the AI may carry attached punctuation ("¿Cómo", "llamas?"); strip
// leading/trailing non-letter/mark chars so a token's surface matches the bare words we
// extract from the mistake text.
const stripEdges = (s: string) => normalize(s).replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '')

// Build the set of normalized words appearing in any mistake's `sourceText`. The match grain
// is the word: a token counts as "incorrect" for the attempt when its (edge-stripped) surface
// is one of these words — case-insensitive (NFC + lowercase) and word-boundary (we tokenize
// the mistake text into whole words rather than substring-matching). This is the heuristic the
// roadmap fixes: "a lemma is incorrect for an attempt when it appears in that attempt's
// mistakes, else correct; every appearance counts seen."
function mistakeWordSet(mistakes: SeenMistake[]): Set<string> {
  const words = new Set<string>()
  for (const m of mistakes) {
    for (const match of (m.sourceText ?? '').matchAll(WORD_RE)) {
      const w = normalize(match[0])
      if (w) words.add(w)
    }
  }
  return words
}

// Reduce one attempt's word breakdown + mistakes into per-root and per-variant deltas. Pure:
// no I/O, no clock. Every token contributes one "seen"; whether that seen is correct or
// incorrect is decided by `mistakeWordSet`. Tokens are grouped by lemma (root grain) and by
// (lemma, surface) (variant grain). `partOfSpeech` is taken from the first token of each lemma,
// matching the "captured on first sight" rule the persistence layer enforces. Tokens with a
// blank surface or lemma are skipped.
export function computeSeenDeltas(
  wordBreakdown: WordToken[],
  mistakes: SeenMistake[]
): SeenWordsDeltas {
  const wrong = mistakeWordSet(mistakes)

  const lexemes = new Map<string, LexemeDelta>()
  const variants = new Map<string, VariantDelta>()

  for (const token of wordBreakdown) {
    const lemma = normalize(token.lemma)
    const surfaceKey = stripEdges(token.surface)
    if (!lemma || !surfaceKey) continue

    const isWrong = wrong.has(surfaceKey)

    const lex = lexemes.get(lemma)
    if (lex) {
      lex.seen += 1
      lex.correct += isWrong ? 0 : 1
      lex.incorrect += isWrong ? 1 : 0
    } else {
      lexemes.set(lemma, {
        lemma,
        partOfSpeech: token.partOfSpeech ?? '',
        seen: 1,
        correct: isWrong ? 0 : 1,
        incorrect: isWrong ? 1 : 0,
      })
    }

    const vKey = `${lemma} ${surfaceKey}`
    const v = variants.get(vKey)
    if (v) {
      v.seen += 1
    } else {
      variants.set(vKey, { lemma, surface: surfaceKey, seen: 1 })
    }
  }

  return { lexemes: [...lexemes.values()], variants: [...variants.values()] }
}
