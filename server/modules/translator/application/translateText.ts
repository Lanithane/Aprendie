import type { UserRow } from '../../../infrastructure/db/schema'
import {
  SENTENCE_MODEL,
  getOperatorAnthropicClient,
} from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import { toTokenUsage } from '../../../infrastructure/claude/pricing'
import { assertCanSpend } from '../../user/application/access'
import { assertSpendEnabled } from '../../settings/application/appSettings'
import { recordUsage } from '../../showback/application/recordUsage'
import { languageName, type LanguageCode, type LocaleCode } from '../../../../shared/languages'

// Byte-static so the cache_control block hits the prompt cache across every user, pair, and
// locale — the variable parts (languages, locale, text) ride in the user turn, exactly like the
// sentence generator. Haiku (SENTENCE_MODEL) keeps this cheap on the operator key.
const SYSTEM_PROMPT = `You are a translation assistant for a language learner.

The user message gives you the language the learner already KNOWS, the language they are LEARNING, a regional locale for the learning language, and a piece of text in the known language.

Translate the text into the learning language, natural and idiomatic for that regional locale — never word-for-word. Prefer the vocabulary, spelling, and phrasing a native speaker of that locale would actually use.

Then, only when genuinely helpful, add ONE short usage note written in the KNOWN language: a register/formality caveat, a gender/agreement detail, a false-friend warning, or a locale-specific word choice. Never restate the translation in the note. Use an empty string when nothing is notable. Do NOT produce a per-word dictionary breakdown.

Return ONLY valid JSON, no markdown, no commentary:
{ "translation": string, "note": string }`

export interface TextTranslation {
  translation: string
  note?: string
}

interface TranslateParams {
  user: UserRow
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  text: string
}

export async function translateText(params: TranslateParams): Promise<TextTranslation> {
  const { user, learnLanguage, guessLanguage, locale, text } = params
  // Translation spends the operator key: assert the account may spend and that the global
  // spend pause is off (mirrors correctTranslation; no daily cap — that counts graded sentences).
  assertCanSpend(user)
  await assertSpendEnabled(user)

  const client = getOperatorAnthropicClient()

  const userText = `Known language (the text is in this): ${languageName(guessLanguage)} (${guessLanguage})
Learning language (translate into this): ${languageName(learnLanguage)} (${learnLanguage})
Regional locale: ${locale} — use vocabulary, spelling, and idioms typical of this region.

Text to translate:
"""
${text}
"""

Return the JSON now.`

  const resp = await client.messages.create({
    model: SENTENCE_MODEL,
    max_tokens: 1024,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userText }],
  })

  // Snapshot the spend for showback, attributed to this user. Never let a usage-recording
  // failure fail the translation.
  recordUsage({
    userId: user.id,
    operation: 'translation',
    model: SENTENCE_MODEL,
    usage: toTokenUsage(resp.usage),
  }).catch((err) => console.error('[showback] recordUsage(translation) failed:', err))

  const raw = extractJsonText(resp, 'translator/translate')
  const parsed = JSON.parse(raw) as { translation?: unknown; note?: unknown }
  if (typeof parsed.translation !== 'string' || parsed.translation.trim().length === 0) {
    throw new Error('[translator/translate] missing translation in response')
  }
  const note = typeof parsed.note === 'string' ? parsed.note.trim() : ''
  return { translation: parsed.translation.trim(), note: note || undefined }
}
