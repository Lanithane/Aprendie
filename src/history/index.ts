export interface HistoryMistake {
  userPhrase: string
  correctPhrase: string
  spanishSource: string
  explanation: string
}

export interface HistoryEntry {
  id: string
  spanish: string
  expectedEnglish: string
  userEnglish: string
  correctedEnglish: string
  score: number
  isCorrect: boolean
  mistakes: HistoryMistake[]
  notes?: string
  locale: string
  createdAt: string
}

const MAX_ENTRIES = 500

const storageKey = (userId: string, locale: string) => `gac:history:${userId}:${locale}`

export function loadHistory(userId: string, locale: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(userId, locale))
    if (!raw) return []
    return JSON.parse(raw) as HistoryEntry[]
  } catch {
    return []
  }
}

interface CorrectionLike {
  sentenceId: string
  spanish: string
  expectedEnglish: string
  userEnglish: string
  correctedEnglish: string
  isCorrect: boolean
  score: number
  mistakes: HistoryMistake[]
  notes?: string
}

export function appendHistory(userId: string, locale: string, result: CorrectionLike) {
  const existing = loadHistory(userId, locale)
  const entry: HistoryEntry = {
    id: result.sentenceId,
    spanish: result.spanish,
    expectedEnglish: result.expectedEnglish,
    userEnglish: result.userEnglish,
    correctedEnglish: result.correctedEnglish,
    score: result.score,
    isCorrect: result.isCorrect,
    mistakes: result.mistakes,
    notes: result.notes,
    locale,
    createdAt: new Date().toISOString(),
  }
  const next = [entry, ...existing].slice(0, MAX_ENTRIES)
  localStorage.setItem(storageKey(userId, locale), JSON.stringify(next))
}
