import { Box, Chip, Stack, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { VariantStatsDto } from '../../api/palabradexApi'
import type { LanguageCode } from '../../../shared/languages'

const VariantRow = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(0.75, 0)};
`

interface VariantListProps {
  variants: VariantStatsDto[]
  learnLanguage: LanguageCode
}

// The variant grain: every inflected surface of a root with its own seen count.
export default function VariantList({ variants, learnLanguage }: VariantListProps) {
  if (variants.length === 0) {
    return (
      <Typography variant='body2' color='text.secondary'>
        No recorded forms yet.
      </Typography>
    )
  }
  return (
    <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
      {variants.map((v) => (
        <VariantRow key={v.surface}>
          <Typography lang={learnLanguage} sx={{ minWidth: 0, wordBreak: 'break-word' }}>
            {v.surface}
          </Typography>
          <Chip
            size='small'
            variant='outlined'
            label={`seen ${v.seenCount}×`}
            sx={{ flexShrink: 0 }}
          />
        </VariantRow>
      ))}
    </Stack>
  )
}
