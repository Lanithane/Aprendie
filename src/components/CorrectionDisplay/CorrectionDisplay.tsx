import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Box,
  Button,
  Divider,
  LinearProgress,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { diffWordsWithSpace } from 'diff'
import type { HistoryMistake } from '../../history'

interface CorrectionDisplayProps {
  spanish: string
  userEnglish: string
  correctedEnglish: string
  isCorrect: boolean
  score: number
  mistakes: HistoryMistake[]
  notes?: string
  onNext: () => void
}

const Diff = styled('div')`
  font-size: 1.15rem;
  line-height: 1.6;
  padding: ${({ theme }) => theme.spacing(2)};
  background: ${({ theme }) => theme.palette.action.hover};
  border-radius: 8px;
  white-space: pre-wrap;
`

const Added = styled('span')`
  color: ${({ theme }) => theme.palette.success.dark};
  background: ${({ theme }) => theme.palette.success.light}33;
  font-weight: 600;
  padding: 0 2px;
  border-radius: 2px;
`

const Removed = styled('span')`
  color: ${({ theme }) => theme.palette.error.dark};
  background: ${({ theme }) => theme.palette.error.light}33;
  text-decoration: line-through;
  padding: 0 2px;
  border-radius: 2px;
`

const MistakeRow = styled(Stack)`
  padding: ${({ theme }) => theme.spacing(1.5)};
  border-left: 3px solid ${({ theme }) => theme.palette.warning.main};
  background: ${({ theme }) => theme.palette.action.hover};
  border-radius: 0 8px 8px 0;
`

export default function CorrectionDisplay({
  spanish,
  userEnglish,
  correctedEnglish,
  isCorrect,
  score,
  mistakes,
  notes,
  onNext,
}: CorrectionDisplayProps) {
  const parts = diffWordsWithSpace(userEnglish, correctedEnglish)

  return (
    <Card aria-live='polite'>
      <CardContent>
        <Stack direction='row' spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
          {isCorrect ? <CheckCircleIcon color='success' /> : <CancelIcon color='warning' />}
          <Typography variant='h5'>
            {isCorrect ? 'Nice!' : "Close — here's what to fix"}
          </Typography>
          <Chip label={`Score ${score}/100`} sx={{ ml: 'auto' }} />
        </Stack>
        <LinearProgress
          variant='determinate'
          value={Math.max(0, Math.min(100, score))}
          color={score >= 80 ? 'success' : score >= 50 ? 'warning' : 'error'}
          sx={{ mb: 2, height: 6, borderRadius: 3 }}
        />

        <Typography variant='overline' color='text.secondary'>
          Spanish
        </Typography>
        <Typography lang='es' sx={{ mb: 2, fontStyle: 'italic' }}>
          {spanish}
        </Typography>

        <Typography variant='overline' color='text.secondary'>
          Your answer vs corrected
        </Typography>
        <Diff>
          {parts.map((p, i) => {
            if (p.added) return <Added key={i}>{p.value}</Added>
            if (p.removed) return <Removed key={i}>{p.value}</Removed>
            return <span key={i}>{p.value}</span>
          })}
        </Diff>

        {mistakes.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='overline' color='text.secondary'>
              Mistakes
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {mistakes.map((m, i) => (
                <MistakeRow key={i} spacing={0.5}>
                  <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip size='small' lang='es' label={m.spanishSource} color='primary' />
                    <Typography variant='body2'>
                      <Removed>{m.userPhrase}</Removed> → <Added>{m.correctPhrase}</Added>
                    </Typography>
                  </Stack>
                  <Typography variant='body2' color='text.secondary'>
                    {m.explanation}
                  </Typography>
                </MistakeRow>
              ))}
            </Stack>
          </>
        )}

        {notes && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='overline' color='text.secondary'>
              Tip
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              {notes}
            </Typography>
          </>
        )}

        <Stack direction='row' sx={{ mt: 3, justifyContent: 'flex-end' }}>
          <Button variant='contained' onClick={onNext} size='large'>
            Next →
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
