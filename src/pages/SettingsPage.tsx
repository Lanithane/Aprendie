import { Typography, Box, Stack, Button, Alert } from '@mui/material'
import SectionCard from '../components/shared/SectionCard'
import LanguagePairPicker from '../components/LanguagePairPicker/LanguagePairPicker'
import { useAuth } from '../auth/AuthContext'
import { useApiKey } from '../hooks/useApiKey'

export default function SettingsPage() {
  const { user } = useAuth()
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
          title='Languages'
          description='Pick what to learn, its regional variant, and the language you answer in.'
        >
          <LanguagePairPicker />
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
