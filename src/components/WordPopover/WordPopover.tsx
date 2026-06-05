import { Popover, Box, Stack, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import {
  GENDER_GLYPH,
  GENDER_LABEL,
  ROOT_LABEL,
  type LanguageCode,
  type WordToken,
} from '../../../shared/languages'
import type { LevelCode } from '../../../shared/levels'

interface WordPopoverProps {
  anchorEl: HTMLElement | null
  token: WordToken | null
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  sentenceLevel?: LevelCode | null
  // Reveal the gloss at every level (the results screen, where the challenge is over). During
  // practice this stays false, so the gloss only shows at Starter to keep A1+ immersive.
  alwaysShowGloss?: boolean
  onClose: () => void
}

// MD3 chip for a single morphological segment (e.g. "ie", "-o"). The secondaryContainer fill
// keeps it on-palette in every theme + mode and reads as a designed token rather than prose.
const SegmentChip = styled('span')`
  flex-shrink: 0;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 600;
  line-height: 1.35;
  background: ${({ theme }) => theme.palette.secondaryContainer};
  color: ${({ theme }) => theme.palette.onSecondaryContainer};
`

// Gender badge pinned to the top-right corner of the card. The tertiaryContainer/on-pair is a
// contrast-correct MD3 role in every theme + mode, so the ♀/♂/⚲ glyph stays legible without a
// hardcoded pink/blue; meaning rides the glyph + accessible name, never colour alone.
const GenderBadge = styled('span')`
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  font-size: 0.95rem;
  line-height: 1;
  background: ${({ theme }) => theme.palette.tertiaryContainer};
  color: ${({ theme }) => theme.palette.onTertiaryContainer};
`

// Claude returns stem changes packed tight ("e→ie") and sometimes with an ASCII arrow ("e->ie").
// Give the arrow breathing room on both sides and normalise it to a single glyph.
function spaceArrows(note: string): string {
  return note.replace(/\s*(?:→|->)\s*/g, ' → ')
}

// Anchored card for a clicked word. The vocabulary stays immersive — the dictionary form
// (lemma) is in the learn language and the word's meaning is never translated. For an
// inflected word it shows the lemma plus each morphological change as a segment chip beside its
// note. For a word already in its base form, repeating it adds nothing, so the heading reads
// "root" instead. Part of speech and notes are in the guess language. Driven by SentenceTokens.
export default function WordPopover({
  anchorEl,
  token,
  learnLanguage,
  guessLanguage,
  sentenceLevel,
  alwaysShowGloss,
  onClose,
}: WordPopoverProps) {
  const isBaseForm = token !== null && token.modifiers.length === 0
  const showGloss = (alwaysShowGloss || sentenceLevel === 'starter') && Boolean(token?.gloss)
  return (
    <Popover
      open={Boolean(anchorEl && token)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      {token && (
        <Box sx={{ p: 1.5, pr: token.gender ? 4.5 : 1.5, maxWidth: 280, position: 'relative' }}>
          {token.gender && (
            <GenderBadge
              role='img'
              aria-label={GENDER_LABEL[guessLanguage][token.gender]}
              title={GENDER_LABEL[guessLanguage][token.gender]}
            >
              {GENDER_GLYPH[token.gender]}
            </GenderBadge>
          )}
          {showGloss && (
            <Typography
              variant='subtitle1'
              lang={guessLanguage}
              sx={{ mb: 0.75, color: 'primary.main', fontWeight: 700, fontSize: '1.125rem' }}
            >
              {token.gloss}
            </Typography>
          )}
          <Stack direction='row' spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            {isBaseForm ? (
              <Typography
                variant='h6'
                component='span'
                lang={guessLanguage}
                sx={{ fontStyle: 'italic', color: 'text.secondary' }}
              >
                {ROOT_LABEL[guessLanguage]}
              </Typography>
            ) : (
              <Typography variant='h6' component='span' lang={learnLanguage}>
                {token.lemma}
              </Typography>
            )}
            {token.partOfSpeech && (
              <Typography
                variant='body1'
                color='text.secondary'
                sx={{ fontStyle: 'italic' }}
                lang={guessLanguage}
              >
                {token.partOfSpeech}
              </Typography>
            )}
          </Stack>
          {token.modifiers.length > 0 && (
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {token.modifiers.map((m, i) => (
                <Stack key={i} direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                  <SegmentChip lang={learnLanguage}>{m.segment}</SegmentChip>
                  <Typography variant='body2' lang={guessLanguage}>
                    {spaceArrows(m.note)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Popover>
  )
}
