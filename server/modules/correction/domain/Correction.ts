export interface CorrectionMistake {
  userPhrase: string
  correctPhrase: string
  spanishSource: string
  explanation: string
}

export interface CorrectionResult {
  isCorrect: boolean
  score: number
  correctedEnglish: string
  mistakes: CorrectionMistake[]
  notes?: string
}

export interface CorrectionView extends CorrectionResult {
  sentenceId: string
  spanish: string
  expectedEnglish: string
  userEnglish: string
}
