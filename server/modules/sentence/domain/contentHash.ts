import { createHash } from 'node:crypto'

// Dedup key for the shared corpus. We normalize the LEARN-language sentence — lowercase, collapse
// whitespace, strip punctuation/symbols (keeping letters, marks and numbers across scripts) — so
// trivial surface variants ("¿Cómo estás?" vs "como estas") hash together and aren't stored twice.
// Paired with the unique index on `(pair, locale, level, contentHash)` in schema.ts.
export function contentHash(promptText: string): string {
  const normalized = promptText
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return createHash('sha256').update(normalized).digest('hex')
}
