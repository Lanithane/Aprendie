import { api } from './client'

export interface CorrectionMistakeDto {
  userPhrase: string
  correctPhrase: string
  spanishSource: string
  explanation: string
}

export interface CorrectionDto {
  sentenceId: string
  spanish: string
  expectedEnglish: string
  userEnglish: string
  isCorrect: boolean
  score: number
  correctedEnglish: string
  mistakes: CorrectionMistakeDto[]
  notes?: string
}

export function submitCorrection(sentenceId: string, userEnglish: string): Promise<CorrectionDto> {
  return api<CorrectionDto>('/api/correct', {
    method: 'POST',
    body: JSON.stringify({ sentenceId, userEnglish }),
  })
}
