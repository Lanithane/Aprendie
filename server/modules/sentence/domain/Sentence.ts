import type { LanguageCode, LocaleCode, WordToken } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import type { SentenceRow } from '../../../infrastructure/db/schema'

export interface SentenceView {
  id: string
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  promptText: string
  answerText: string
  level: LevelCode | null
  // The everyday-domain the sentence was built on (a `CATEGORY_DOMAINS` string), surfaced so the
  // practice card can show the topic chip and the client can honor a pinned topic.
  theme: string | null
  wordBreakdown: WordToken[]
}

export interface GeneratedSentence {
  promptText: string
  answerText: string
  level: LevelCode
  // The everyday-domain category the model based the sentence on (e.g. "food, cooking and eating
  // out"). Echoed back per sentence so the corpus row records it for Epic 21's same-category review.
  theme: string | null
  wordBreakdown: WordToken[]
}

export function toSentenceView(row: SentenceRow): SentenceView {
  return {
    id: row.id,
    learnLanguage: row.learnLanguage as LanguageCode,
    guessLanguage: row.guessLanguage as LanguageCode,
    locale: row.locale,
    promptText: row.promptText,
    answerText: row.answerText,
    level: (row.level as LevelCode | null) ?? null,
    theme: row.theme ?? null,
    wordBreakdown: row.wordBreakdown ?? [],
  }
}
