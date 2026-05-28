import { useState } from 'react'
import {
  Typography,
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Button,
  Alert,
} from '@mui/material'
import { useAuth } from '../auth/AuthContext'
import { useLocale } from '../locale/useLocale'
import { LOCALE_LABELS, type SpanishLocale } from '../../shared/types'
import { api, ApiError } from '../api/client'

export default function SettingsPage() {
  const { user, refresh } = useAuth()
  const { locale, setLocale } = useLocale()
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const removeKey = async () => {
    if (!confirm("Remove your API key? You'll need to re-enter it to keep practicing.")) return
    setRemoving(true)
    setError(null)
    try {
      await api('/api/key', { method: 'DELETE' })
      await refresh()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Failed to remove key')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 3 }}>
        Settings
      </Typography>
      <Stack spacing={3} sx={{ maxWidth: 540 }}>
        <Card variant='outlined'>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 1 }}>
              Spanish locale
            </Typography>
            <Typography color='text.secondary' sx={{ mb: 2 }} variant='body2'>
              Changes regional vocabulary and idioms in generated sentences.
            </Typography>
            <FormControl fullWidth>
              <InputLabel id='locale-label'>Locale</InputLabel>
              <Select
                labelId='locale-label'
                value={locale}
                label='Locale'
                onChange={(e) => setLocale(e.target.value as SpanishLocale)}
              >
                {(Object.keys(LOCALE_LABELS) as SpanishLocale[]).map((k) => (
                  <MenuItem key={k} value={k}>
                    {LOCALE_LABELS[k]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        <Card variant='outlined'>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 1 }}>
              Anthropic API key
            </Typography>
            <Typography color='text.secondary' sx={{ mb: 2 }} variant='body2'>
              {user?.hasApiKey
                ? 'A key is currently stored (encrypted server-side). Remove it to enter a new one.'
                : 'No key set.'}
            </Typography>
            {error && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {user?.hasApiKey && (
              <Button variant='outlined' color='error' onClick={removeKey} disabled={removing}>
                {removing ? 'Removing…' : 'Remove API key'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card variant='outlined'>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 1 }}>
              Account
            </Typography>
            <Typography color='text.secondary' variant='body2'>
              {user?.email}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button variant='outlined' component='a' href='/api/auth/logout'>
                Sign out
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}
