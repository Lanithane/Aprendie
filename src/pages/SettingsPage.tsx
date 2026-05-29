import {
  Typography,
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
} from '@mui/material'
import SectionCard from '../components/shared/SectionCard'
import { useAuth } from '../auth/AuthContext'
import { useLocale } from '../hooks/useLocale'
import { useApiKey } from '../hooks/useApiKey'
import { LOCALE_LABELS, type SpanishLocale } from '../../shared/types'

export default function SettingsPage() {
  const { user } = useAuth()
  const { locale, setLocale } = useLocale()
  const { remove, removing, error } = useApiKey()

  const onRemoveKey = () => {
    if (!confirm("Remove your API key? You'll need to re-enter it to keep practicing.")) return
    void remove()
  }

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 3 }}>
        Settings
      </Typography>
      <Stack spacing={3} sx={{ maxWidth: 540 }}>
        <SectionCard
          title='Spanish locale'
          description='Changes regional vocabulary and idioms in generated sentences.'
        >
          <FormControl fullWidth>
            <InputLabel id='locale-label'>Locale</InputLabel>
            <Select
              labelId='locale-label'
              value={locale}
              label='Locale'
              onChange={(e) => setLocale(e.target.value as SpanishLocale)}
            >
              {Object.keys(LOCALE_LABELS).map((k) => (
                <MenuItem key={k} value={k}>
                  {LOCALE_LABELS[k as SpanishLocale]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </SectionCard>

        <SectionCard
          title='Anthropic API key'
          description={
            user?.hasApiKey
              ? 'A key is currently stored (encrypted server-side). Remove it to enter a new one.'
              : 'No key set.'
          }
        >
          {error && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {user?.hasApiKey && (
            <Button variant='outlined' color='error' onClick={onRemoveKey} disabled={removing}>
              {removing ? 'Removing…' : 'Remove API key'}
            </Button>
          )}
        </SectionCard>

        <SectionCard title='Account' description={user?.email}>
          <Box sx={{ mt: 2 }}>
            <Button variant='outlined' component='a' href='/api/auth/logout'>
              Sign out
            </Button>
          </Box>
        </SectionCard>
      </Stack>
    </Box>
  )
}
