import type {
  GrammarDetailBlock,
  GrammarDetailRow,
  GrammarPosSection,
} from '../../../../shared/grammar'

// The grammar reference's typed shape is shared across the wire — re-export it so the rest of the
// module reads the model from its own domain rather than reaching into `shared/` directly.
export type {
  GrammarExample,
  GrammarDetailRow,
  GrammarDetailBlock,
  GrammarPosSection,
  GrammarReference,
} from '../../../../shared/grammar'

// The (untrusted) raw section shape as it arrives from the model, before normalisation. Every
// field is optional/loose so a malformed entry is dropped rather than crashing the parse.
export interface RawGrammarSection {
  pos?: unknown
  title?: unknown
  explanation?: unknown
  members?: unknown
  example?: { text?: unknown; translation?: unknown } | null
  detail?: unknown
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function normaliseRow(raw: unknown): GrammarDetailRow | null {
  if (!raw || typeof raw !== 'object') return null
  const { label, value } = raw as { label?: unknown; value?: unknown }
  const l = str(label)
  const v = str(value)
  if (!l || !v) return null
  return { label: l, value: v }
}

function normaliseBlock(raw: unknown): GrammarDetailBlock | null {
  if (!raw || typeof raw !== 'object') return null
  const { heading, note, rows } = raw as { heading?: unknown; note?: unknown; rows?: unknown }
  const h = str(heading)
  if (!h) return null
  const cleanRows = Array.isArray(rows)
    ? rows.map(normaliseRow).filter((r): r is GrammarDetailRow => r !== null)
    : []
  if (cleanRows.length === 0) return null
  const block: GrammarDetailBlock = { heading: h, rows: cleanRows }
  const n = str(note)
  if (n) block.note = n
  return block
}

// Pure: turn one raw section into a typed `GrammarPosSection`, or null if it's missing anything a
// usable section needs (pos, title, explanation, at least one member, and a complete example). The
// `pos` key is lowercased so it's a stable id for React keys. Detail blocks are best-effort — a
// section with none is still valid (just no drill-down).
export function normaliseSection(raw: RawGrammarSection): GrammarPosSection | null {
  const pos = str(raw.pos).toLowerCase()
  const title = str(raw.title)
  const explanation = str(raw.explanation)
  const members = Array.isArray(raw.members) ? raw.members.map(str).filter((m) => m.length > 0) : []
  const exampleText = str(raw.example?.text)
  const exampleTranslation = str(raw.example?.translation)

  if (!pos || !title || !explanation || members.length === 0 || !exampleText) return null

  const detail = Array.isArray(raw.detail)
    ? raw.detail.map(normaliseBlock).filter((b): b is GrammarDetailBlock => b !== null)
    : []

  return {
    pos,
    title,
    explanation,
    members,
    example: { text: exampleText, translation: exampleTranslation },
    detail,
  }
}

// Pure: normalise a raw `sections[]` payload, dropping any unusable section. The caller decides what
// to do with an empty result (treat it as a generation failure).
export function normaliseGrammarSections(raw: unknown): GrammarPosSection[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((s) => normaliseSection((s ?? {}) as RawGrammarSection))
    .filter((s): s is GrammarPosSection => s !== null)
}
