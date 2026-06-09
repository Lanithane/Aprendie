import { useState } from 'react'
import { Box, Button, CircularProgress, Typography, TextField, Alert } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import GradeChip from '../shared/GradeChip'
import StreakIndicator from '../StreakIndicator/StreakIndicator'
import { scoreToGrade } from '../../../shared/grades'
import { useAutoFocus } from '../../hooks/useAutoFocus'
import { useSpeech } from '../../hooks/useSpeech'
import { useSpeechRate } from '../../hooks/useSpeechRate'
import ListenControls from '../shared/ListenControls'
import type { FlashcardDto, FlashcardGradeDto } from '../../api/flashcardApi'

interface FlashCardProps {
  card: FlashcardDto | null
  // Whether to show the part-of-speech / gender chips. Suppressed on function-word decks
  // (Conjunctions, Common Verbs, …) where the deck title already names the part of speech, so the
  // chip would just repeat it; kept for category-noun decks where the chips add real info (noun +
  // gender).
  showMeta: boolean
  grade: FlashcardGradeDto | null
  grading: boolean
  error: string | null
  onSubmit: (answer: string) => void
  onNext: () => void
}

const Card = styled('div')`
  position: relative;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4, 3)};
  background: ${({ theme }) => theme.palette.surfaceContainerLow};
  border-radius: 24px;
  border: 1.5px solid ${({ theme }) => theme.palette.outlineVariant};
`

const LemmaDisplay = styled('div')`
  text-align: center;
  font-size: 2.4rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.palette.text.primary};
  ${({ theme }) => theme.breakpoints.down('sm')} {
    font-size: 1.9rem;
  }
`

const MetaRow = styled('div')`
  display: flex;
  gap: ${({ theme }) => theme.spacing(1)};
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
`

const MetaChip = styled('span')`
  font-size: 0.78rem;
  padding: ${({ theme }) => theme.spacing(0.25, 0.9)};
  border-radius: 8px;
  background: ${({ theme }) => theme.palette.surfaceContainerHigh};
  color: ${({ theme }) => theme.palette.text.secondary};
  text-transform: capitalize;
`

const RevealSection = styled('div')`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1.5)};
  padding-top: ${({ theme }) => theme.spacing(1.5)};
  border-top: 1px solid ${({ theme }) => theme.palette.outlineVariant};
`

const ExampleBlock = styled('div')`
  background: ${({ theme }) => theme.palette.surfaceContainerHighest};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing(1.5, 2)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(0.5)};
`

export default function FlashCard({
  card,
  showMeta,
  grade,
  grading,
  error,
  onSubmit,
  onNext,
}: FlashCardProps) {
  const { t } = useTranslation()
  const [answer, setAnswer] = useState('')
  const { speak, cancel, speaking, supported: speechSupported } = useSpeech()
  const { rate, setRate } = useSpeechRate()
  // Focuses the Next button the moment the grade result appears.
  const nextRef = useAutoFocus<HTMLButtonElement>(grade?.flashcardId)

  if (!card) {
    return (
      <Card>
        <CircularProgress />
      </Card>
    )
  }

  const gradeLabel = grade ? scoreToGrade(grade.score) : null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !grade && !grading && answer.trim()) {
      e.preventDefault()
      onSubmit(answer.trim())
    }
  }

  return (
    <Card>
      {/* Grade avatar pinned to top-right corner of the card once graded */}
      {grade && gradeLabel && (
        <Box sx={{ position: 'absolute', top: 14, right: 14 }}>
          <GradeChip grade={gradeLabel} size='medium' />
        </Box>
      )}

      <LemmaDisplay>{card.lemma}</LemmaDisplay>

      {showMeta && (
        <MetaRow>
          <MetaChip>{card.partOfSpeech}</MetaChip>
          {card.gender && <MetaChip>{card.gender}</MetaChip>}
        </MetaRow>
      )}

      {/* Listen button — available on both question and result screens */}
      {speechSupported && (
        <ListenControls
          text={card.lemma}
          locale={card.locale}
          speak={speak}
          cancel={cancel}
          speaking={speaking}
          rate={rate}
          setRate={setRate}
        />
      )}

      {error && (
        <Alert severity='error' sx={{ width: '100%' }}>
          {error}
        </Alert>
      )}

      {!grade ? (
        <>
          <TextField
            autoFocus
            fullWidth
            // No floating label: the outline-notch label overlaps the field border on iOS Safari, so
            // we follow the app's working pattern (PracticeCard / Translator) — placeholder +
            // aria-label instead.
            placeholder={t('flashcards.typeMeaning')}
            aria-label={t('flashcards.typeMeaning')}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={grading}
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='none'
            spellCheck={false}
            variant='outlined'
          />
          {/* Streak pill bottom-left; Check pinned right via ml:auto so it holds position whether
              or not the streak is showing. */}
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <StreakIndicator />
            <Button
              variant='contained'
              size='large'
              onClick={() => onSubmit(answer.trim())}
              disabled={grading || !answer.trim()}
              sx={{ ml: 'auto', borderRadius: '999px', minWidth: 140 }}
            >
              {grading ? <CircularProgress size={22} color='inherit' /> : t('flashcards.check')}
            </Button>
          </Box>
        </>
      ) : (
        <>
          <RevealSection>
            <div>
              <Typography variant='body1' sx={{ fontWeight: 700 }}>
                {grade.acceptedGloss}
              </Typography>
              {!grade.isCorrect && (
                <Typography variant='body2' color='text.secondary'>
                  {t('flashcards.youTyped', { answer })}
                </Typography>
              )}
            </div>
            {grade.note && (
              <Typography variant='body2' color='text.secondary'>
                {grade.note}
              </Typography>
            )}
            {(grade.example || grade.exampleTranslation) && (
              <ExampleBlock>
                {grade.example && (
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {grade.example}
                  </Typography>
                )}
                {grade.exampleTranslation && (
                  <Typography variant='body2' color='text.secondary'>
                    {grade.exampleTranslation}
                  </Typography>
                )}
              </ExampleBlock>
            )}
          </RevealSection>
          <Button
            ref={nextRef}
            variant='contained'
            size='large'
            onClick={onNext}
            sx={{ alignSelf: 'flex-end', borderRadius: '999px', minWidth: 140 }}
          >
            {t('common.next')}
          </Button>
        </>
      )}
    </Card>
  )
}
