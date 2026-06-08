import { Alert, Button, Stack, Typography } from '@mui/material'
import { useGrammar } from '../../../hooks/useGrammar'
import LoadingSpinner from '../../shared/LoadingSpinner'
import GrammarPosCard from './GrammarPosCard'
import type { LanguagePair } from '../../../../shared/languages'

interface GrammarReferenceProps {
  pair: LanguagePair
}

// The Palabradex "Language" mode: the part-of-speech reference for the active pair — the language's
// own building blocks, distinct from the per-user word collection. Generated on first visit and
// cached server-side per (learn, guess, locale), so it tracks the learn language chosen in Settings.
export default function GrammarReference({ pair }: GrammarReferenceProps) {
  const { reference, loading, error, reload } = useGrammar(pair)

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Alert severity='error' sx={{ width: '100%' }}>
          {error}
        </Alert>
        <Button color='secondary' size='small' onClick={() => void reload()}>
          Try again
        </Button>
      </Stack>
    )
  }

  if (!reference || reference.sections.length === 0) {
    return (
      <Typography color='text.secondary'>No grammar reference for this language yet.</Typography>
    )
  }

  return (
    <Stack spacing={2}>
      {reference.sections.map((section) => (
        <GrammarPosCard
          key={section.pos}
          section={section}
          learnLanguage={reference.learnLanguage}
          guessLanguage={reference.guessLanguage}
        />
      ))}
    </Stack>
  )
}
