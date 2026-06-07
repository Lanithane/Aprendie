import { styled } from '@mui/material/styles'
import { Stack } from '@mui/material'

// Shared styled atoms for the grade result, used by both the finished CorrectionDisplay and the
// streaming preview (StreamingCorrection) so the two render identically.

export const DiffLine = styled('div')`
  font-size: 1.1rem;
  line-height: 1.6;
  padding: ${({ theme }) => theme.spacing(1.25, 1.5)};
  border-radius: 12px;
  background: ${({ theme }) => theme.palette.surfaceContainerHighest};
  white-space: pre-wrap;
`

export const PromptHeadline = styled('div')`
  font-size: 1.7rem;
  font-weight: 500;
  line-height: 1.35;
  font-style: italic;
  padding: ${({ theme }) => theme.spacing(1, 0, 2)};
  ${({ theme }) => theme.breakpoints.down('sm')} {
    font-size: 1.35rem;
  }
`

export const MistakeRow = styled(Stack)`
  padding: ${({ theme }) => theme.spacing(1.25, 1.5)};
  border-left: 4px solid ${({ theme }) => theme.palette.tertiary.main};
  background: ${({ theme }) => theme.palette.surfaceContainerHighest};
  border-radius: 0 12px 12px 0;
`

export const Added = styled('span')`
  color: ${({ theme }) => theme.palette.success.main};
  font-weight: 700;
`

export const Removed = styled('span')`
  color: ${({ theme }) => theme.palette.error.main};
  text-decoration: line-through;
  font-weight: 500;
`
