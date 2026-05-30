import type { UserRow } from '../../../infrastructure/db/schema'
import { SENTENCE_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import { anthropicClientForUser } from '../../apiKey/application/anthropicClientForUser'
import {
  LANGUAGES,
  defaultLocaleFor,
  isValidLocaleFor,
  languageName,
  type LanguageCode,
  type LocaleCode,
} from '../../../../shared/languages'

const SYSTEM_PROMPT_TEXT =
  'You map a place description to the best regional locale for a language a learner is studying. The user message gives the language, a list of allowed locale codes (each with its region), and a free-text location. Choose the single allowed locale whose region best matches the location (consider country, state/region, and dialect). If nothing matches well, choose the first listed locale. Return ONLY valid JSON: { "locale": "<one allowed code>" }.'

interface ResolveLocaleInput {
  user: UserRow
  learnLanguage: LanguageCode
  location: string
}

export async function resolveLocale(input: ResolveLocaleInput): Promise<{ locale: LocaleCode }> {
  const { learnLanguage, location } = input
  const def = LANGUAGES[learnLanguage]
  const fallback = defaultLocaleFor(learnLanguage)
  // Languages without regional variants have nothing to resolve.
  if (!def || def.locales.length === 0) return { locale: fallback }

  const allowed = def.locales.map((l) => `${l.code} = ${l.label}`).join('\n')
  const userText = `Language: ${languageName(learnLanguage)} (${learnLanguage})
Allowed locale codes:
${allowed}
Location: "${location}"

Return the best-matching locale code now.`

  try {
    const anthropic = anthropicClientForUser(input.user)
    const resp = await anthropic.messages.create({
      model: SENTENCE_MODEL,
      max_tokens: 100,
      system: [{ type: 'text', text: SYSTEM_PROMPT_TEXT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userText }],
    })
    const text = extractJsonText(resp, 'language/resolveLocale')
    const parsed = JSON.parse(text) as { locale?: string }
    if (parsed.locale && isValidLocaleFor(learnLanguage, parsed.locale)) {
      return { locale: parsed.locale }
    }
  } catch {
    // Fall back to the default locale on any model/parse failure.
  }
  return { locale: fallback }
}
