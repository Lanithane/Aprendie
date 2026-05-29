import { useState } from 'react'
import { Card, CardContent, Typography, TextField, Button, Alert, Stack, Link } from '@mui/material'
import { useApiKey } from '../../hooks/useApiKey'

export default function ApiKeySetup() {
  const [key, setKey] = useState('')
  const { save, saving, error } = useApiKey()

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
            Don&apos;t have one?{' '}
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
            onClick={() => void save(key.trim())}
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
