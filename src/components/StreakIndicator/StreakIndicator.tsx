import { useState, useCallback } from 'react'
import { Typography, Popper, Paper, ClickAwayListener } from '@mui/material'
import { styled } from '@mui/material/styles'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import { useTranslation } from 'react-i18next'
import { useStreak } from '../../streak/StreakContext'

const Pill = styled('div')`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(0.75)};
  padding: ${({ theme }) => theme.spacing(0.5, 1.5)};
  border-radius: 999px;
  background: ${({ theme }) => theme.palette.surfaceContainerHigh};
  color: ${({ theme }) => theme.palette.onSurface};
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms ease;
  &:hover {
    background: ${({ theme }) => theme.palette.surfaceContainerHighest};
  }
`

const Flame = styled(LocalFireDepartmentIcon, {
  shouldForwardProp: (prop) => prop !== 'lit',
})<{ lit: boolean }>`
  font-size: 1.25rem;
  color: ${({ theme, lit }) => (lit ? theme.palette.warning.main : theme.palette.outline)};
  animation: streak-pop 2s ease-in-out;
  @keyframes streak-pop {
    0% {
      transform: scale(1);
      filter: drop-shadow(0 0 0px transparent);
    }
    60% {
      transform: scale(1.12);
      filter: drop-shadow(0 0 5px ${({ theme }) => theme.palette.warning.main});
    }
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0px transparent);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const PopperPaper = styled(Paper)`
  padding: ${({ theme }) => theme.spacing(1.5, 2)};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(0.25)};
  background: ${({ theme }) => theme.palette.surfaceContainerHighest};
  border-radius: 12px;
  min-width: 110px;
  box-shadow: ${({ theme }) => theme.shadows[3]};
`

const PopperFlame = styled(LocalFireDepartmentIcon)`
  font-size: 2rem;
  color: ${({ theme }) => theme.palette.warning.main};
  margin-bottom: ${({ theme }) => theme.spacing(0.25)};
`

export default function StreakIndicator() {
  const { t } = useTranslation()
  const { streak, advanceNonce } = useStreak()
  const [open, setOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)

  const toggle = useCallback(() => setOpen((v) => !v), [])
  const close = useCallback(() => setOpen(false), [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'Escape') {
        close()
      }
    },
    [toggle, close]
  )

  if (!streak.enabled || !streak.alive || streak.current < 1) return null

  return (
    <>
      <Pill
        ref={setAnchorEl}
        role='button'
        tabIndex={0}
        aria-expanded={open}
        aria-label={t('streak.indicatorAria', { count: streak.current })}
        onClick={toggle}
        onKeyDown={handleKeyDown}
      >
        <Flame key={advanceNonce} lit={streak.activeToday} />
        <Typography component='span' variant='body2' sx={{ fontWeight: 600 }}>
          {streak.current}
        </Typography>
      </Pill>

      <Popper open={open} anchorEl={anchorEl} placement='top-start' disablePortal>
        <ClickAwayListener onClickAway={close}>
          <PopperPaper elevation={0}>
            <PopperFlame />
            <Typography variant='h6' sx={{ lineHeight: 1 }}>
              {t('streak.days', { count: streak.current })}
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5 }}>
              {t('streak.best', { count: streak.longest })}
            </Typography>
          </PopperPaper>
        </ClickAwayListener>
      </Popper>
    </>
  )
}
