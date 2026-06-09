import { Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import { useTranslation } from 'react-i18next'
import { useStreak } from '../../streak/StreakContext'

// A deliberately quiet streak indicator: a flame + day count in a pill, tucked into the bottom-left
// of the practice cards (HomePage's PracticeCard / FlashCard). It hides entirely when the learner
// has opted out or the streak has lapsed, and pops gently the moment today's first activity advances
// it — no modal, no confetti. Spacing/alignment are owned by the card footer that holds it.
const Pill = styled('div')`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(0.75)};
  padding: ${({ theme }) => theme.spacing(0.5, 1.5)};
  border-radius: 999px;
  background: ${({ theme }) => theme.palette.surfaceContainerHigh};
  color: ${({ theme }) => theme.palette.onSurface};
`

// The flame is warm (amber) once today is counted, muted while the streak is still alive but today
// is untouched — a gentle "keep it going" rather than a nag. Keyed by the advance nonce so it
// remounts and replays the pop on each advance; honors reduced-motion.
const Flame = styled(LocalFireDepartmentIcon, {
  shouldForwardProp: (prop) => prop !== 'lit',
})<{ lit: boolean }>`
  font-size: 1.25rem;
  color: ${({ theme, lit }) => (lit ? theme.palette.warning.main : theme.palette.outline)};
  animation: streak-pop 450ms ease-out;
  @keyframes streak-pop {
    0% {
      transform: scale(1);
    }
    45% {
      transform: scale(1.3);
      filter: drop-shadow(0 0 4px ${({ theme }) => theme.palette.warning.main});
    }
    100% {
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export default function StreakIndicator() {
  const { t } = useTranslation()
  const { streak, advanceNonce } = useStreak()
  if (!streak.enabled || !streak.alive || streak.current < 1) return null

  return (
    <Pill aria-label={t('streak.indicatorAria', { count: streak.current })}>
      <Flame key={advanceNonce} lit={streak.activeToday} />
      <Typography component='span' variant='body2' sx={{ fontWeight: 600 }}>
        {streak.current}
      </Typography>
    </Pill>
  )
}
