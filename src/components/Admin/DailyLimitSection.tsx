import { useState } from 'react'
import {
  Stack,
  TextField,
  Button,
  Typography,
  Chip,
  CircularProgress,
  InputAdornment,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import { format } from 'date-fns'
import SectionCard from '../shared/SectionCard'
import { useNow } from '../../hooks/useNow'
import type { AdminUser } from '../../api/adminApi'

type CapSaveState = 'idle' | 'saving' | 'success' | 'error'

interface DailyLimitSectionProps {
  user: AdminUser
  busy: boolean
  setCapExempt: (id: string, until: string | null) => Promise<boolean>
  setCapOverride: (id: string, cap: number | null) => Promise<boolean>
}

// Next UTC midnight — when the daily counter resets, so "rest of today" lines up with the cap.
function nextUtcReset(): string {
  const d = new Date()
  d.setUTCHours(24, 0, 0, 0)
  return d.toISOString()
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString()
}

// Per-user daily-limit controls: a custom cap override plus a temporary "uncap for a bit".
export default function DailyLimitSection({
  user,
  busy,
  setCapExempt,
  setCapOverride,
}: DailyLimitSectionProps) {
  const [capField, setCapField] = useState(
    user.dailyCapOverride != null ? String(user.dailyCapOverride) : ''
  )
  const [capSaveState, setCapSaveState] = useState<CapSaveState>('idle')
  const [customUntil, setCustomUntil] = useState('')
  const now = useNow()

  const exemptActive = user.capExemptUntil != null && new Date(user.capExemptUntil).getTime() > now

  const trimmed = capField.trim()
  const parsedCap = trimmed === '' ? null : Number(trimmed)
  const capValid = parsedCap === null || (Number.isInteger(parsedCap) && parsedCap >= 1)
  const capDirty = (user.dailyCapOverride ?? null) !== parsedCap

  const saveCap = async () => {
    if (busy || !capValid || !capDirty || capSaveState === 'saving') return
    setCapSaveState('saving')
    const ok = await setCapOverride(user.id, parsedCap)
    if (ok) {
      setCapSaveState('success')
      setTimeout(() => setCapSaveState('idle'), 5000)
    } else {
      setCapSaveState('error')
      setTimeout(() => setCapSaveState('idle'), 5000)
    }
  }

  const capAdornment =
    capSaveState === 'saving' ? (
      <InputAdornment position='end'>
        <CircularProgress size={16} />
      </InputAdornment>
    ) : capSaveState === 'success' ? (
      <InputAdornment position='end'>
        <CheckCircleOutlineIcon color='success' fontSize='small' />
      </InputAdornment>
    ) : capSaveState === 'error' ? (
      <InputAdornment position='end'>
        <HighlightOffIcon color='error' fontSize='small' />
      </InputAdornment>
    ) : null

  return (
    <SectionCard
      title='Daily limit'
      description='Used today resets at 00:00 UTC. A custom cap overrides the global one; an uncap lifts the cap entirely until it expires.'
    >
      <Stack spacing={2}>
        <Stack direction='row' spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={`Used today: ${user.usedToday} / ${user.effectiveCap}`} />
          {exemptActive && user.capExemptUntil && (
            <Chip
              color='info'
              variant='outlined'
              label={`Uncapped until ${format(new Date(user.capExemptUntil), 'MMM d, HH:mm')}`}
            />
          )}
        </Stack>

        <Stack spacing={0.5}>
          <TextField
            size='small'
            type='number'
            label='Custom cap'
            placeholder='Global'
            value={capField}
            disabled={busy || capSaveState === 'saving'}
            error={!capValid}
            onChange={(e) => setCapField(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveCap()
            }}
            slotProps={{
              htmlInput: { min: 1, max: 10000, step: 1 },
              input: { endAdornment: capAdornment },
            }}
            sx={{ maxWidth: 220 }}
          />
          <Typography variant='caption' color='text.secondary'>
            Blank uses the global cap. Press Enter to save.
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant='subtitle2'>Temporary uncap</Typography>
          <Stack direction='row' sx={{ flexWrap: 'wrap', gap: 1.5 }}>
            <Button
              color='secondary'
              disabled={busy}
              onClick={() => void setCapExempt(user.id, nextUtcReset())}
            >
              Rest of today
            </Button>
            <Button
              color='secondary'
              disabled={busy}
              onClick={() => void setCapExempt(user.id, hoursFromNow(24))}
            >
              24 hours
            </Button>
            <Button
              color='secondary'
              disabled={busy}
              onClick={() => void setCapExempt(user.id, hoursFromNow(24 * 7))}
            >
              7 days
            </Button>
            <Button
              color='error'
              disabled={busy || !exemptActive}
              onClick={() => void setCapExempt(user.id, null)}
            >
              Re-cap now
            </Button>
          </Stack>
          <Stack
            direction='row'
            spacing={1.5}
            sx={{ alignItems: 'center', flexWrap: 'wrap', mt: '24px !important' }}
          >
            <TextField
              size='small'
              type='datetime-local'
              label='Until (custom)'
              value={customUntil}
              disabled={busy}
              onChange={(e) => setCustomUntil(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ maxWidth: 240 }}
            />
            <Button
              color='secondary'
              disabled={busy || customUntil === ''}
              onClick={() => {
                const iso = new Date(customUntil).toISOString()
                void setCapExempt(user.id, iso).then((ok) => ok && setCustomUntil(''))
              }}
            >
              Apply
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </SectionCard>
  )
}
