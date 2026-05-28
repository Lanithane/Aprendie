import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Link,
} from '@mui/material'
import { api, ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'

export default function ApiKeySetup() {
  const { refresh } = useAuth()
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setError(null)
    setSaving(true)
    try {
      await api('/api/key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: key.trim() }),
      })
      await refresh()
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Failed to save API key')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card sx={{ maxWidth: 540, mx: 'auto', mt: 6 }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant='h5'>Connect your Anthropic API key</Typography>
          <Typography color='text.secondary'>
            Sentences and corrections are powered by the Claude API. Your key is encrypted and
            stored server-side — it never lives in your browser. You can revoke it any time in
            Settings.
          </Typography>
          <Typography color='text.secondary' variant='body2'>
            Don't have one?{' '}
            <Link
              href='https://console.anthropic.com/settings/keys'
              target='_blank'
              rel='noopener noreferrer'
            >
              Get a key at console.anthropic.com
            </Link>{' '}
            and set a spending cap on it.
          </Typography>
          <TextField
            label='Anthropic API key'
            type='password'
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder='sk-ant-...'
            autoComplete='off'
            fullWidth
          />
          {error && <Alert severity='error'>{error}</Alert>}
          <Button
            variant='contained'
            onClick={submit}
            disabled={!key.trim() || saving}
            size='large'
          >
            {saving ? 'Validating…' : 'Save & continue'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
