import { Box, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { GrammarDetailBlock } from '../../../api/grammarApi'
import type { LanguageCode } from '../../../../shared/languages'

// One drill-down block: a heading, an optional note, and a label→value table. The value is in the
// learn language (a conjugated form, an article, a pronoun); the label is a person/number/gender
// tag (guess language) or a learn-language pronoun, so it's left language-neutral.
const Row = styled(Box)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: ${({ theme }) => theme.spacing(1.5)};
  align-items: baseline;
  padding: ${({ theme }) => theme.spacing(0.5, 0)};
  & + & {
    border-top: 1px solid ${({ theme }) => theme.palette.outlineVariant};
  }
`

interface GrammarDetailTableProps {
  block: GrammarDetailBlock
  learnLanguage: LanguageCode
}

export default function GrammarDetailTable({ block, learnLanguage }: GrammarDetailTableProps) {
  return (
    <Box>
      <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
        {block.heading}
      </Typography>
      {block.note && (
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.25, mb: 0.5 }}>
          {block.note}
        </Typography>
      )}
      <Box sx={{ mt: 0.5 }}>
        {block.rows.map((row, i) => (
          <Row key={`${row.label}-${i}`}>
            <Typography variant='caption' color='text.secondary'>
              {row.label}
            </Typography>
            <Typography variant='body2' lang={learnLanguage} sx={{ wordBreak: 'break-word' }}>
              {row.value}
            </Typography>
          </Row>
        ))}
      </Box>
    </Box>
  )
}
