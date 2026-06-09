import { useState } from 'react'
import { IconButton, Slider, Stack, Tooltip, Popover, Typography } from '@mui/material'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import type { LocaleCode } from '../../../shared/languages'
import { MIN_RATE, MAX_RATE } from '../../hooks/useSpeechRate'

// The "1.0×" affordance that opens the rate popover — quiet until the user reaches for it.
const RateButton = styled('button')`
  appearance: none;
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: ${({ theme }) => theme.spacing(0.5, 1)};
  border-radius: 999px;
  color: ${({ theme }) => theme.palette.text.secondary};
  &:hover {
    background: ${({ theme }) => theme.palette.action.hover};
    color: ${({ theme }) => theme.palette.primary.main};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: 1px;
  }
`

interface ListenControlsProps {
  text: string
  locale: LocaleCode
  speak: (text: string, locale: string, rate?: number) => void
  cancel: () => void
  speaking: boolean
  rate: number
  setRate: (rate: number) => void
}

// Read-aloud affordance shared by the practice and correction screens: a quiet "1.0×" rate
// button (opens the speed popover) paired with a listen/stop toggle. Presentational — the parent
// owns the single useSpeech / useSpeechRate instance and passes it down, so the rate the slider
// edits is the same one used for auto-speak and stays in sync within the tab.
export default function ListenControls({
  text,
  locale,
  speak,
  cancel,
  speaking,
  rate,
  setRate,
}: ListenControlsProps) {
  const { t } = useTranslation()
  const [rateAnchor, setRateAnchor] = useState<HTMLElement | null>(null)
  const rateOpen = Boolean(rateAnchor)

  return (
    <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
      <Tooltip title={t('listen.playbackSpeed')}>
        <RateButton
          type='button'
          onClick={(e) => setRateAnchor(e.currentTarget)}
          aria-haspopup='dialog'
          aria-expanded={rateOpen}
          aria-label={t('listen.speedAria', { rate: rate.toFixed(1) })}
        >
          {rate.toFixed(1)}×
        </RateButton>
      </Tooltip>
      <Tooltip title={speaking ? t('listen.stop') : t('listen.listen')}>
        <IconButton
          size='small'
          color='primary'
          onClick={() => (speaking ? cancel() : speak(text, locale, rate))}
          aria-label={speaking ? t('listen.stopAria') : t('listen.listenAria')}
        >
          {speaking ? <StopRoundedIcon /> : <VolumeUpRoundedIcon />}
        </IconButton>
      </Tooltip>

      <Popover
        open={rateOpen}
        anchorEl={rateAnchor}
        onClose={() => setRateAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { px: 2.25, pt: 1.875, pb: 1.875, width: 260 } } }}
      >
        <Typography variant='caption' color='text.secondary'>
          {t('listen.playbackSpeed')}
        </Typography>
        <Slider
          size='small'
          value={rate}
          min={MIN_RATE}
          max={MAX_RATE}
          step={0.1}
          marks={[
            { value: MIN_RATE, label: t('listen.slow') },
            { value: 1, label: '1×' },
            { value: MAX_RATE, label: t('listen.fast') },
          ]}
          valueLabelDisplay='auto'
          valueLabelFormat={(v) => `${v.toFixed(1)}×`}
          onChange={(_, v) => setRate(v)}
          aria-label={t('listen.rateAria')}
          sx={{
            '& .MuiSlider-markLabel[data-index="0"]': { transform: 'translateX(0%)' },
            '& .MuiSlider-markLabel[data-index="2"]': { transform: 'translateX(-100%)' },
          }}
        />
      </Popover>
    </Stack>
  )
}
