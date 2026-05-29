import type { LanguageCode, LanguagePair, LocaleCode } from '../../shared/languages'
import type { LevelCode } from '../../shared/levels'

export interface HistoryMistake {
  userPhrase: string
  correctPhrase: string
  sourceText: string
  explanation: string
}

export interface HistoryEntry {
  id: string
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level: LevelCode | null
  promptText: string
  answerText: string
  userAnswer: string
  correctedAnswer: string
  score: number
  isCorrect: boolean
  mistakes: HistoryMistake[]
  notes?: string
  createdAt: string
}

const MAX_ENTRIES = 500

const storageKey = (userId: string, pair: LanguagePair) =>
  `gac:history:${userId}:${pair.learnLanguage}:${pair.guessLanguage}:${pair.locale}`

export function loadHistory(userId: string, pair: LanguagePair): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(userId, pair))
    if (!raw) return []
    return JSON.parse(raw) as HistoryEntry[]
  } catch {
    return []
  }
}

interface CorrectionLike {
  sentenceId: string
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level: LevelCode | null
  promptText: string
  answerText: string
  userAnswer: string
  correctedAnswer: string
  isCorrect: boolean
  score: number
  mistakes: HistoryMistake[]
  notes?: string
}

export function appendHistory(userId: string, pair: LanguagePair, result: CorrectionLike) {
  const existing = loadHistory(userId, pair)
  const entry: HistoryEntry = {
    id: result.sentenceId,
    learnLanguage: result.learnLanguage,
    guessLanguage: result.guessLanguage,
    locale: result.locale,
    level: result.level,
    promptText: result.promptText,
    answerText: result.answerText,
    userAnswer: result.userAnswer,
    correctedAnswer: result.correctedAnswer,
    score: result.score,
    isCorrect: result.isCorrect,
    mistakes: result.mistakes,
    notes: result.notes,
    createdAt: new Date().toISOString(),
  }
  const next = [entry, ...existing].slice(0, MAX_ENTRIES)
  localStorage.setItem(storageKey(userId, pair), JSON.stringify(next))
}
