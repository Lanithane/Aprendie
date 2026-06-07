import { api, readApiError } from './client'
import type { LanguageCode, LocaleCode, WordToken } from '../../shared/languages'
import type { LevelCode } from '../../shared/levels'

export interface CorrectionMistakeDto {
  userPhrase: string
  correctPhrase: string
  sourceText: string
  explanation: string
}

export interface CorrectionDto {
  sentenceId: string
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level: LevelCode | null
  promptText: string
  answerText: string
  userAnswer: string
  isCorrect: boolean
  score: number
  grade: string
  naturalness: 'natural' | 'stiff'
  correctedAnswer: string
  mistakes: CorrectionMistakeDto[]
  notes?: string
  wordBreakdown: WordToken[]
}

export function submitCorrection(sentenceId: string, userAnswer: string): Promise<CorrectionDto> {
  return api<CorrectionDto>('/api/correct', {
    method: 'POST',
    body: JSON.stringify({ sentenceId, userAnswer }),
  })
}

// A best-effort partial grade, revealed while the model streams. Only fields safe to show early:
// the corrected answer (once its closing quote arrives) and any mistakes that have fully streamed.
export interface CorrectionPreview {
  correctedAnswer?: string
  mistakes: CorrectionMistakeDto[]
}

// Stream a grade over SSE, calling `onPreview` with a partial each time more text arrives and
// resolving with the authoritative CorrectionDto on the `done` event. Throws an ApiError for gate
// failures (the server answers those as a normal HTTP error before streaming begins) and a plain
// Error if the stream drops mid-grade — the caller can then fall back to the blocking endpoint.
export async function submitCorrectionStream(
  sentenceId: string,
  userAnswer: string,
  onPreview: (preview: CorrectionPreview) => void,
  signal?: AbortSignal
): Promise<CorrectionDto> {
  const res = await fetch('/api/correct/stream', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sentenceId, userAnswer }),
    signal,
  })
  if (!res.ok || !res.body) throw await readApiError(res)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''
  let done: CorrectionDto | null = null
  let streamError: string | null = null

  for (;;) {
    const { value, done: finished } = await reader.read()
    if (finished) break
    buffer += decoder.decode(value, { stream: true })
    // SSE frames are separated by a blank line; each carries one `data:` JSON payload.
    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const dataLine = buffer
        .slice(0, sep)
        .split('\n')
        .find((line) => line.startsWith('data:'))
      buffer = buffer.slice(sep + 2)
      if (!dataLine) continue
      const event = JSON.parse(dataLine.slice(5).trim()) as
        | { type: 'delta'; text: string }
        | { type: 'done'; view: CorrectionDto }
        | { type: 'error'; message?: string }
      if (event.type === 'delta') {
        accumulated += event.text
        onPreview(parsePartialCorrection(accumulated))
      } else if (event.type === 'done') {
        done = event.view
      } else {
        streamError = event.message ?? 'grading failed'
      }
    }
  }

  if (done) return done
  throw new Error(streamError ?? 'grading stream ended unexpectedly')
}

// --- streaming preview parsing -------------------------------------------------------------------
// The grade arrives as an incomplete JSON object. We don't need a full parse for the live preview —
// just the corrected answer and any complete mistakes — and the authoritative result replaces this
// the instant `done` lands, so a partial or empty snapshot is fine.

function parsePartialCorrection(text: string): CorrectionPreview {
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '')
  return {
    correctedAnswer: extractCompleteString(cleaned, 'correctedAnswer'),
    mistakes: extractCompleteMistakes(cleaned),
  }
}

// The value of a string field, but only once its closing quote has streamed in (escape-aware).
function extractCompleteString(text: string, key: string): string | undefined {
  const match = new RegExp(`"${key}"\\s*:\\s*("(?:\\\\.|[^"\\\\])*")`).exec(text)
  if (!match) return undefined
  try {
    return JSON.parse(match[1]) as string
  } catch {
    return undefined
  }
}

// Each fully-streamed object inside the "mistakes" array, in order. Stops at the first object whose
// closing brace hasn't arrived yet.
function extractCompleteMistakes(text: string): CorrectionMistakeDto[] {
  const head = /"mistakes"\s*:\s*\[/.exec(text)
  if (!head) return []
  const out: CorrectionMistakeDto[] = []
  let i = head.index + head[0].length
  while (i < text.length) {
    while (i < text.length && /[\s,]/.test(text[i])) i++
    if (text[i] !== '{') break // end of the array, or nothing more to take
    const end = matchingBrace(text, i)
    if (end === -1) break // this object is still streaming
    try {
      const o = JSON.parse(text.slice(i, end + 1)) as Partial<CorrectionMistakeDto>
      if (
        typeof o.userPhrase === 'string' &&
        typeof o.correctPhrase === 'string' &&
        typeof o.sourceText === 'string' &&
        typeof o.explanation === 'string'
      ) {
        out.push({
          userPhrase: o.userPhrase,
          correctPhrase: o.correctPhrase,
          sourceText: o.sourceText,
          explanation: o.explanation,
        })
      }
    } catch {
      // malformed slice — skip it
    }
    i = end + 1
  }
  return out
}

// Index of the brace closing the object opened at `open`, or -1 if it hasn't streamed yet. String-
// aware so braces inside quoted values don't miscount.
function matchingBrace(text: string, open: number): number {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = open; i < text.length; i++) {
    const c = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (c === '\\') {
      if (inString) escaped = true
      continue
    }
    if (c === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}
