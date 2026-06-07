import { Typography, CircularProgress, Alert, LinearProgress } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
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

const Tile = styled('button')`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing(1.5)};
  padding: ${({ theme }) => theme.spacing(2.5, 2.5, 2)};
  border: 1.5px solid ${({ theme }) => theme.palette.outlineVariant};
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
    border-color: ${({ theme }) => theme.palette.outline};
  }
  &:active {
    background: ${({ theme }) => theme.palette.surfaceContainerHigh};
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

function deckStatusLabel(deck: DeckDto): string {
  const { seen, total, struggling } = deck.progress
  if (total === 0) return 'Not yet generated'
  if (seen === 0) return `${total} cards`
  if (seen < total) return `${seen} / ${total} seen`
  return struggling > 0 ? `${struggling} to review` : 'Complete'
}

export default function DeckPicker({ decks, loading, error, onSelect }: DeckPickerProps) {
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
        Choose a deck
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
                    {deckStatusLabel(deck)}
                  </Typography>
                  {hasStruggling && (
                    <Typography variant='caption' color='error.main'>
                      {struggling} struggling
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
