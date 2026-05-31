import { useState } from 'react'
import { styled } from '@mui/material/styles'
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  Typography,
  Stack,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Snackbar,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import LoadingSpinner from '../shared/LoadingSpinner'
import { useAdminSettings } from '../../hooks/useAdminSettings'
import { useNow } from '../../hooks/useNow'
import type { AdminUser } from '../../api/adminApi'

const StatGrid = styled('div')`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing(1.5)};
  ${({ theme }) => theme.breakpoints.down('sm')} {
    grid-template-columns: 1fr;
  }
`

const StatTile = styled('div')`
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing(1.5, 2)};
  background: ${({ theme }) => theme.palette.surfaceContainerHigh};
  color: ${({ theme }) => theme.palette.text.primary};
`

type CapSaveState = 'idle' | 'saving' | 'success' | 'error'

interface LimitsPanelProps {
  users: AdminUser[]
}

// Site-wide spend/abuse controls, shown above the user list. Owns the global settings
// (daily cap + two kill switches) and surfaces a few derived stats off the user list.
export default function LimitsPanel({ users }: LimitsPanelProps) {
  const { settings, loading, error, update } = useAdminSettings()
  const [capInput, setCapInput] = useState('')
  const [capSaveState, setCapSaveState] = useState<CapSaveState>('idle')
  const [snackbarOpen, setSnackbarOpen] = useState(false)

  const now = useNow()
  const pending = users.filter((u) => u.access === 'pending').length
  const gradedToday = users.reduce((sum, u) => sum + u.usedToday, 0)
  const uncapped = users.filter(
    (u) => u.capExemptUntil && new Date(u.capExemptUntil).getTime() > now
  ).length

  const capValue = capInput !== '' ? capInput : settings ? String(settings.dailyGradedCap) : ''
  const capDirty = settings != null && capValue !== String(settings.dailyGradedCap)

  const saveCap = async () => {
    const next = Number(capValue)
    if (!Number.isInteger(next) || next < 1 || !capDirty || capSaveState === 'saving') return
    setCapSaveState('saving')
    const ok = await update({ dailyGradedCap: next })
    if (ok) {
      setCapInput('')
      setCapSaveState('success')
      setTimeout(() => setCapSaveState('idle'), 5000)
    } else {
      setCapSaveState('error')
      setSnackbarOpen(true)
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
    <Card variant='outlined'>
      <CardContent>
        <Typography variant='h6' sx={{ mb: 1 }}>
          Limits and site controls
        </Typography>
        <Typography color='text.secondary' variant='body2' sx={{ mb: 2 }}>
          Tune the shared operator key. Admins are never capped or paused.
        </Typography>

        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading || !settings ? (
          <LoadingSpinner />
        ) : (
          <Stack spacing={2.5}>
            <StatGrid>
              <StatTile>
                <Typography variant='h4'>{pending}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  Pending approval
                </Typography>
              </StatTile>
              <StatTile>
                <Typography variant='h4'>{gradedToday}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  Graded today
                </Typography>
              </StatTile>
              <StatTile>
                <Typography variant='h4'>{uncapped}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  Uncapped now
                </Typography>
              </StatTile>
            </StatGrid>

            <Divider />

            <Stack spacing={0.5}>
              <TextField
                size='small'
                type='number'
                label='Daily graded cap'
                value={capValue}
                disabled={capSaveState === 'saving'}
                onChange={(e) => setCapInput(e.target.value)}
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
                Graded sentences per user per day
              </Typography>
            </Stack>

            <Stack spacing={1.5}>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoApproveSignups}
                      onChange={(e) => void update({ autoApproveSignups: e.target.checked })}
                    />
                  }
                  label='Auto-approve new accounts'
                />
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                  New sign-ups are immediately approved instead of landing in the pending queue.
                </Typography>
              </Box>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.signupsPaused}
                      onChange={(e) => void update({ signupsPaused: e.target.checked })}
                    />
                  }
                  label='Pause new signups'
                />
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                  New accounts are turned away at sign-in. Existing users are unaffected.
                </Typography>
              </Box>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      color='warning'
                      checked={settings.spendPaused}
                      onChange={(e) => void update({ spendPaused: e.target.checked })}
                    />
                  }
                  label='Pause all practice (maintenance)'
                />
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                  Stops every account from spending the key. Use for cost spikes or incidents.
                </Typography>
              </Box>
            </Stack>
          </Stack>
        )}
      </CardContent>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity='error' onClose={() => setSnackbarOpen(false)}>
          Failed to save cap
        </Alert>
      </Snackbar>
    </Card>
  )
}
