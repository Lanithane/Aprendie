import type { WordToken } from '../../../shared/languages'

// A single run of the rendered sentence: either a meaningful word backed by a
// WordToken (clickable) or inert text (whitespace, punctuation, or a word with no
// matching breakdown entry).
export interface SentenceSegment {
  text: string
  token: WordToken | null
}

// Word run = one or more letters/marks, allowing internal apostrophes or hyphens
// (so "l’eau", "anti-héros", "qu’est-ce" stay whole). Everything else (spaces,
// punctuation) falls between matches and is emitted as inert text.
const WORD_RE = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu

const normalize = (s: string) => s.normalize('NFC').toLowerCase().trim()

// Surface strings from the AI may include attached punctuation (e.g. "¿Cómo", "llamas?")
// because the prompt asks for the word "as it appears in promptText". Strip leading/trailing
// non-letter/mark chars so the key matches what WORD_RE extracts from the sentence text.
const surfaceKey = (s: string) => normalize(s).replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '')

// Split `text` into ordered segments, attaching a WordToken to each word run whose
// surface matches (case-insensitively). Punctuation and whitespace are preserved as
// inert segments so the original sentence renders verbatim. Words without a matching
// breakdown entry (and every word when `breakdown` is empty) render as inert text.
export function tokenizeSentence(text: string, breakdown: WordToken[]): SentenceSegment[] {
  const bySurface = new Map<string, WordToken>()
  for (const token of breakdown) {
    const key = surfaceKey(token.surface)
    // First occurrence wins, so a repeated surface keeps its earliest breakdown entry.
    if (key && !bySurface.has(key)) bySurface.set(key, token)
  }

  const segments: SentenceSegment[] = []
  let last = 0
  for (const match of text.matchAll(WORD_RE)) {
    const start = match.index ?? 0
    if (start > last) segments.push({ text: text.slice(last, start), token: null })
    const word = match[0]
    segments.push({ text: word, token: bySurface.get(normalize(word)) ?? null })
    last = start + word.length
  }
  if (last < text.length) segments.push({ text: text.slice(last), token: null })
  return segments
}
