import { useState } from 'react'
import { Box, Button, Card, CardContent, Chip, Collapse, Stack, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import GrammarDetailTable from './GrammarDetailTable'
import type { GrammarPosSection } from '../../../api/grammarApi'
import type { LanguageCode } from '../../../../shared/languages'

// The example sentence sits on a faint surface tone so it reads as a quoted specimen, not body text
// (MD3 elevation = surface-container tone, never a shadow overlay).
const ExampleBlock = styled(Box)`
  margin-top: ${({ theme }) => theme.spacing(1.5)};
  padding: ${({ theme }) => theme.spacing(1.25, 1.5)};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  background: ${({ theme }) => theme.palette.surfaceContainerHigh};
`

interface GrammarPosCardProps {
  section: GrammarPosSection
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
}

// One part-of-speech section: the overview (explanation + member words + an example sentence) is
// always visible; the drill-down detail tables (conjugation, agreement, article/pronoun sets) are
// revealed on demand. Member words and the example are in the learn language; everything
// explanatory is in the guess language.
export default function GrammarPosCard({
  section,
  learnLanguage,
  guessLanguage,
}: GrammarPosCardProps) {
  const [open, setOpen] = useState(false)
  const hasDetail = section.detail.length > 0

  return (
    <Card variant='outlined'>
      <CardContent>
        <Typography variant='h6'>{section.title}</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.25 }}>
          {section.explanation}
        </Typography>

        <Stack direction='row' spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 1.5 }}>
          {section.members.map((member) => (
            <Chip
              key={member}
              size='small'
              variant='outlined'
              label={member}
              lang={learnLanguage}
            />
          ))}
        </Stack>

        <ExampleBlock>
          <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
            Example
          </Typography>
          <Typography lang={learnLanguage} sx={{ fontWeight: 500 }}>
            {section.example.text}
          </Typography>
          {section.example.translation && (
            <Typography variant='body2' color='text.secondary' lang={guessLanguage}>
              {section.example.translation}
            </Typography>
          )}
        </ExampleBlock>

        {hasDetail && (
          <>
            <Button
              size='small'
              color='secondary'
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              endIcon={
                <ExpandMoreIcon
                  sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                />
              }
              sx={{ mt: 1.5, ml: -0.5 }}
            >
              {open ? 'Hide forms' : 'Show forms'}
            </Button>
            <Collapse in={open} unmountOnExit>
              <Stack spacing={2} sx={{ mt: 1.5 }}>
                {section.detail.map((block, i) => (
                  <GrammarDetailTable
                    key={`${block.heading}-${i}`}
                    block={block}
                    learnLanguage={learnLanguage}
                  />
                ))}
              </Stack>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  )
}
