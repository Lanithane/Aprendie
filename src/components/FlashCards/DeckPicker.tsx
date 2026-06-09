import { Typography, CircularProgress, Alert, LinearProgress } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { DeckDto } from '../../api/flashcardApi'

interface DeckPickerProps {
  decks: DeckDto[]
  loading: boolean
  error: string | null
  onSelect: (deckId: string) => void
}

const Grid = styled('div')`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing(2)};
  width: 100%;
`

// Hover/focus thickens the border into the primary colour — a 2.5px ring flush with the card edge
// (constant width at rest so the colour swap doesn't shift layout).
const Tile = styled('button')`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing(1.5)};
  padding: ${({ theme }) => theme.spacing(2.5, 2.5, 2)};
  border: 3.5px solid ${({ theme }) => theme.palette.outlineVariant};
  border-radius: 16px;
  background: ${({ theme }) => theme.palette.surfaceContainerLow};
  color: ${({ theme }) => theme.palette.text.primary};
  cursor: pointer;
  text-align: left;
  transition:
    background 120ms,
    border-color 120ms;
  &:hover {
    background: ${({ theme }) => theme.palette.surfaceContainer};
  }
  &:active {
    background: ${({ theme }) => theme.palette.surfaceContainerHigh};
  }
  &:hover,
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.palette.primary.main};
  }
`

const ProgressRow = styled('div')`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(0.5)};
`

const ProgressMeta = styled('div')`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

function deckStatusLabel(deck: DeckDto, t: TFunction): string {
  const { seen, total, struggling } = deck.progress
  if (total === 0) return t('flashcards.notGenerated')
  if (seen === 0) return t('flashcards.cardsCount', { count: total })
  if (seen < total) return t('flashcards.seenProgress', { seen, total })
  return struggling > 0 ? t('flashcards.toReview', { count: struggling }) : t('flashcards.complete')
}

export default function DeckPicker({ decks, loading, error, onSelect }: DeckPickerProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing(4) }}>
        <CircularProgress />
      </div>
    )
  }

  if (error) {
    return <Alert severity='error'>{error}</Alert>
  }

  return (
    <div style={{ width: '100%' }}>
      <Typography variant='h5' gutterBottom>
        {t('flashcards.chooseDeck')}
      </Typography>
      <Grid>
        {decks.map((deck) => {
          const { seen, total, struggling } = deck.progress
          const pct = total > 0 ? Math.round((seen / total) * 100) : 0
          const hasStruggling = struggling > 0
          return (
            <Tile key={deck.id} onClick={() => onSelect(deck.id)}>
              <div>
                <Typography variant='h6' sx={{ fontWeight: 700 }}>
                  {deck.label}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {deck.examples.join(', ')}
                </Typography>
              </div>
              <ProgressRow>
                <ProgressMeta>
                  <Typography variant='caption' color='text.secondary'>
                    {deckStatusLabel(deck, t)}
                  </Typography>
                  {hasStruggling && (
                    <Typography variant='caption' color='error.main'>
                      {t('flashcards.struggling', { count: struggling })}
                    </Typography>
                  )}
                </ProgressMeta>
                {total > 0 && (
                  <LinearProgress
                    variant='determinate'
                    value={pct}
                    color={hasStruggling ? 'error' : seen === total ? 'success' : 'primary'}
                    sx={{ borderRadius: 4, height: 6 }}
                  />
                )}
              </ProgressRow>
            </Tile>
          )
        })}
      </Grid>
    </div>
  )
}
