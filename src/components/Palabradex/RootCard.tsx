import { Box, Chip, Collapse, ListItemButton, Stack, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import VariantList from './VariantList'
import LoadingSpinner from '../shared/LoadingSpinner'
import { usePalabradexEntry } from '../../hooks/usePalabradexEntry'
import { useLexemeDefinition } from '../../hooks/useLexemeDefinition'
import type { LexemeStatsDto } from '../../api/palabradexApi'
import type { LanguageCode } from '../../../shared/languages'

// Accuracy = correct sightings ÷ total sightings. The dot uses the theme's fixed semantic ramp
// (success/warning/error are traffic-light, theme-invariant) so the colour reads the same in
// every palette: green ≥80%, amber ≥50%, red below.
function accuracyColor(correct: number, seen: number): 'success' | 'warning' | 'error' {
  if (seen === 0) return 'warning'
  const pct = (correct / seen) * 100
  if (pct >= 80) return 'success'
  if (pct >= 50) return 'warning'
  return 'error'
}

const AccuracyDot = styled('span', {
  shouldForwardProp: (p) => p !== '$tone',
})<{ $tone: 'success' | 'warning' | 'error' }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme, $tone }) => theme.palette[$tone].main};
`

interface RootCardProps {
  entry: LexemeStatsDto
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  open: boolean
  onToggle: () => void
}

export default function RootCard({
  entry,
  learnLanguage,
  guessLanguage,
  open,
  onToggle,
}: RootCardProps) {
  // Lazy: only fetch variants once this row is expanded (lemma undefined keeps the hook idle).
  const { detail, loading } = usePalabradexEntry(learnLanguage, open ? entry.lemma : undefined)
  // Likewise lazy — the translated meaning loads independently of the variants.
  const {
    definition,
    loading: definitionLoading,
    error: definitionError,
  } = useLexemeDefinition(learnLanguage, guessLanguage, open ? entry.lemma : undefined)
  const tone = accuracyColor(entry.correctCount, entry.seenCount)
  const accuracyPct =
    entry.seenCount === 0 ? 0 : Math.round((entry.correctCount / entry.seenCount) * 100)

  return (
    <>
      <ListItemButton
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`Toggle ${entry.lemma} details`}
        sx={{ gap: 1.5, py: 1.25, px: 2, borderRadius: 0 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction='row' spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Typography
              lang={learnLanguage}
              variant='body1'
              sx={{ fontWeight: 600, minWidth: 0, wordBreak: 'break-word' }}
            >
              {entry.lemma}
            </Typography>
            {entry.partOfSpeech ? (
              <Chip size='small' variant='outlined' label={entry.partOfSpeech} />
            ) : null}
          </Stack>
        </Box>
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center', flexShrink: 0, color: 'text.secondary' }}
        >
          <Typography variant='caption'>seen {entry.seenCount}×</Typography>
          <AccuracyDot $tone={tone} aria-hidden />
          <Typography variant='caption' aria-label={`${accuracyPct}% correct`}>
            {accuracyPct}%
          </Typography>
        </Stack>
        <ExpandMoreIcon
          sx={{
            flexShrink: 0,
            color: 'action.active',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: '0.2s',
          }}
        />
      </ListItemButton>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
          {definitionLoading ? (
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
              Loading definition…
            </Typography>
          ) : definition ? (
            <Typography lang={guessLanguage} variant='body2' sx={{ mb: 1.5 }}>
              {definition}
            </Typography>
          ) : definitionError ? (
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
              Definition unavailable.
            </Typography>
          ) : null}
          <Stack direction='row' spacing={2} sx={{ mb: 1.5 }}>
            <Typography variant='caption' color='success.main'>
              {entry.correctCount} correct
            </Typography>
            <Typography variant='caption' color='error.main'>
              {entry.incorrectCount} incorrect
            </Typography>
          </Stack>
          {loading ? (
            <LoadingSpinner />
          ) : (
            <VariantList variants={detail?.variants ?? []} learnLanguage={learnLanguage} />
          )}
        </Box>
      </Collapse>
    </>
  )
}
