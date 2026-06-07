import { useState } from 'react'
import { Typography, Button } from '@mui/material'
import { styled } from '@mui/material/styles'
import DeckPicker from '../components/FlashCards/DeckPicker'
import FlashCard from '../components/FlashCards/FlashCard'
import { useLanguagePair } from '../hooks/useLanguagePair'
import { useFlashcardDecks } from '../hooks/useFlashcardDecks'
import { useFlashcardSession } from '../hooks/useFlashcardSession'

const PageWrap = styled('div')`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing(3)};
  padding-block: ${({ theme }) => theme.spacing(2)};
`

const SessionHeader = styled('div')`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing(1)};
`

export default function FlashCardsPage() {
  const { pair } = useLanguagePair()
  // Store deck selection with the pair it belongs to; derived activeDeckId goes null if pair changes.
  const [activeDeckState, setActiveDeckState] = useState<{
    deckId: string
    learnLanguage: string
    guessLanguage: string
    locale: string
  } | null>(null)
  const activeDeckId =
    activeDeckState?.learnLanguage === pair.learnLanguage &&
    activeDeckState?.guessLanguage === pair.guessLanguage &&
    activeDeckState?.locale === pair.locale
      ? activeDeckState.deckId
      : null

  const { decks, loading: decksLoading, error: decksError } = useFlashcardDecks(pair)
  const { state, loadNext, submit } = useFlashcardSession(pair)

  const handleDeckSelect = (deckId: string) => {
    setActiveDeckState({ deckId, ...pair })
    loadNext(deckId)
  }

  const activeDeck = activeDeckId ? decks.find((d) => d.id === activeDeckId) : null

  if (!activeDeckId) {
    return (
      <PageWrap>
        <Typography variant='h3'>Flash cards</Typography>
        <DeckPicker
          decks={decks}
          loading={decksLoading}
          error={decksError}
          onSelect={handleDeckSelect}
        />
      </PageWrap>
    )
  }

  const card =
    state.phase === 'question' || state.phase === 'grading' || state.phase === 'result'
      ? state.card
      : null
  const grade = state.phase === 'result' ? state.grade : null
  const grading = state.phase === 'grading'
  const sessionError = state.phase === 'error' ? state.message : null

  return (
    <PageWrap>
      <SessionHeader>
        <Button
          variant='text'
          size='small'
          onClick={() => setActiveDeckState(null)}
          sx={{ borderRadius: '999px' }}
        >
          ← All decks
        </Button>
        {activeDeck && <Typography variant='h5'>{activeDeck.label}</Typography>}
      </SessionHeader>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <FlashCard
          key={card?.id ?? 'loading'}
          card={card}
          grade={grade}
          grading={grading}
          error={sessionError}
          onSubmit={submit}
          onNext={() => loadNext(activeDeckId)}
        />
      </div>
    </PageWrap>
  )
}
