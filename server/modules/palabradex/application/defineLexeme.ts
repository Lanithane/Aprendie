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
import { languageName, type LanguageCode } from '../../../../shared/languages'
import * as palabradexRepository from '../persistence/palabradexRepository'

// Byte-static so the cache_control block hits the prompt cache across every user, pair, and
// word — the variable parts (languages, lemma) ride in the user turn, exactly like the sentence
// generator and translator. Haiku (SENTENCE_MODEL) keeps this cheap on the operator key.
const SYSTEM_PROMPT = `You are a bilingual dictionary for a language learner.

The user message gives you the language the learner is LEARNING, the language they already KNOW, and a single dictionary headword (lemma) in the learning language.

Write a concise dictionary definition of that headword, in the KNOWN language. Give the core meaning(s) — at most the two or three most common senses, separated by semicolons. Keep it short: a gloss, not an encyclopedia. If the word has a clear single-word equivalent in the known language, lead with it. Do not include the headword itself, pronunciation, examples, or grammar labels.

Return ONLY valid JSON, no markdown, no commentary:
{ "definition": string }`

interface DefineParams {
  user: UserRow
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  lemma: string
}

// Returns a definition of a learn-language root written in the known (guess) language, or null
// when the user has never collected that root (a clean 404 for the controller). Definitions are
// shared across users and cached, so a hit costs nothing; only a genuine miss spends the
// operator key, and that spend is gated exactly like the translator.
export async function defineLexeme(params: DefineParams): Promise<string | null> {
  const { user, learnLanguage, guessLanguage, lemma } = params

  // Only define words the user has actually met — bounds operator-key spend to their own
  // Palabradex rather than arbitrary lookups.
  const root = await palabradexRepository.getLexeme(user.id, learnLanguage, lemma)
  if (!root) return null

  const cached = await palabradexRepository.getDefinition(learnLanguage, guessLanguage, lemma)
  if (cached) return cached.definition

  assertCanSpend(user)
  await assertSpendEnabled(user)

  const client = getOperatorAnthropicClient()

  const userText = `Learning language (the headword is in this): ${languageName(learnLanguage)} (${learnLanguage})
Known language (write the definition in this): ${languageName(guessLanguage)} (${guessLanguage})

Headword: ${lemma}

Return the JSON now.`

  const resp = await client.messages.create({
    model: SENTENCE_MODEL,
    max_tokens: 512,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userText }],
  })

  // Snapshot the spend for showback, attributed to this user. A definition is a word-level
  // translation, so it rides the existing 'translation' operation. Never let a usage-recording
  // failure fail the definition.
  recordUsage({
    userId: user.id,
    operation: 'translation',
    model: SENTENCE_MODEL,
    usage: toTokenUsage(resp.usage),
  }).catch((err) => console.error('[showback] recordUsage(definition) failed:', err))

  const raw = extractJsonText(resp, 'palabradex/define')
  const parsed = JSON.parse(raw) as { definition?: unknown }
  if (typeof parsed.definition !== 'string' || parsed.definition.trim().length === 0) {
    throw new Error('[palabradex/define] missing definition in response')
  }
  const definition = parsed.definition.trim()

  await palabradexRepository.saveDefinition(learnLanguage, guessLanguage, lemma, definition)
  return definition
}
