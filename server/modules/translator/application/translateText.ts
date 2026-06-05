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
// locale — the variable parts (languages, locale, direction, text) ride in the user turn, exactly
// like the sentence generator. Haiku (SENTENCE_MODEL) keeps this cheap on the operator key.
const SYSTEM_PROMPT = `You are a translation assistant for a language learner.

The user message gives you the SOURCE language (the text is written in this), the TARGET language (translate into this), the language the learner already KNOWS, and a regional locale for the learner's LEARNING language.

Translate the text into the target language, natural and idiomatic — never word-for-word. For whichever side is the learner's locale-specific learning language, prefer the vocabulary, spelling, and phrasing a native speaker of that locale would actually use.

Then, only when genuinely helpful, add ONE short usage note written in the language the learner KNOWS: a register/formality caveat, a gender/agreement detail, a false-friend warning, or a locale-specific word choice. Never restate the translation in the note. Use an empty string when nothing is notable. Do NOT produce a per-word dictionary breakdown.

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
  // When true, translate from the learning language back to the known language (the user flipped
  // the swap toggle). Default false: known → learning, the standard direction.
  swapped?: boolean
}

export async function translateText(params: TranslateParams): Promise<TextTranslation> {
  const { user, learnLanguage, guessLanguage, locale, text, swapped = false } = params
  // Translation spends the operator key: assert the account may spend and that the global
  // spend pause is off (mirrors correctTranslation; no daily cap — that counts graded sentences).
  assertCanSpend(user)
  await assertSpendEnabled(user)

  const client = getOperatorAnthropicClient()

  // The locale always describes the learning language; only the source/target flip on swap.
  const sourceLanguage = swapped ? learnLanguage : guessLanguage
  const targetLanguage = swapped ? guessLanguage : learnLanguage

  const userText = `Source language (the text is in this): ${languageName(sourceLanguage)} (${sourceLanguage})
Target language (translate into this): ${languageName(targetLanguage)} (${targetLanguage})
Language the learner knows: ${languageName(guessLanguage)} (${guessLanguage})
Learning-language regional locale: ${locale} — use vocabulary, spelling, and idioms typical of this region.

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
