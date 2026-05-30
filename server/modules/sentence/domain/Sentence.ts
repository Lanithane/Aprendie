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
  wordBreakdown: WordToken[]
}

export interface GeneratedSentence {
  promptText: string
  answerText: string
  level: LevelCode
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
    wordBreakdown: row.wordBreakdown ?? [],
  }
}
