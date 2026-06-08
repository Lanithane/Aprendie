// Grammar-reference wire types, shared by the frontend (src/) and backend (server/). This is the
// language-scoped "how the language is built" view that backs the Palabradex "Language" mode (Epic
// 19) — the counterpart to the per-user word collection. Content is generated once per
// (learnLanguage, guessLanguage, locale) and cached server-side, then served as `GrammarReference`.
//
// Convention: every *member word* and *example sentence* is in the LEARN language (the language
// being studied); every *explanation, title, heading, note, and translation* is in the GUESS
// language (the learner's known language) so the grammar reads in a language they already speak.

import type { LanguageCode, LocaleCode } from './languages'

// One example sentence showing a part of speech in use: the sentence in the learn language plus a
// natural translation in the guess language.
export interface GrammarExample {
  text: string // the sentence, in the LEARN language
  translation: string // its translation, in the GUESS language
}

// One row of a drill-down table: a label/value pair, e.g. a conjugation ("yo" → "hablo"), an
// article cell ("masculine singular" → "el"), or a pronoun ("1st person singular" → "yo"). `value`
// is in the learn language; `label` is whatever reads best (a person/number/gender tag in the guess
// language, or a learn-language pronoun) — the UI treats it as plain text.
export interface GrammarDetailRow {
  label: string
  value: string
}

// A drill-down block revealed when a POS section is expanded: a titled mini-table (conjugation
// pattern, gender/number grid, pronoun set, agreement example, …) with an optional prose note.
export interface GrammarDetailBlock {
  heading: string // in the GUESS language, e.g. "Present tense — regular -ar verbs (hablar)"
  note?: string // optional prose, in the GUESS language
  rows: GrammarDetailRow[]
}

// One part-of-speech section of the overview: a short explanation, a handful of common members in
// the learn language, one example sentence, and zero or more expandable detail blocks.
export interface GrammarPosSection {
  pos: string // canonical lowercase key, e.g. "verb" (stable id for keys/ordering)
  title: string // display label, in the GUESS language, e.g. "Verbs"
  explanation: string // 1-2 sentence explanation, in the GUESS language
  members: string[] // common members, in the LEARN language, e.g. ["de", "a", "en", "con"]
  example: GrammarExample
  detail: GrammarDetailBlock[] // empty => no drill-down for this POS
}

// The full reference for one (learn, guess, locale) triple — the server response shape.
export interface GrammarReference {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  sections: GrammarPosSection[]
}
