import {
  Typography,
  Box,
  Stack,
  Button,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import SectionCard from '../components/shared/SectionCard'
import LanguagePairPicker from '../components/LanguagePairPicker/LanguagePairPicker'
import ThemePicker from '../components/ThemePicker/ThemePicker'
import { useAuth } from '../auth/AuthContext'
import { useApiKey } from '../hooks/useApiKey'
import { useLevelPreference } from '../hooks/useLevelPreference'
import { useThemeMode, type ThemeMode } from '../ThemeModeProvider'
import { LEVELS, levelLabel } from '../../shared/levels'

export default function SettingsPage() {
  const { user } = useAuth()
  const { remove, removing, error } = useApiKey()
  const { pref, setPref } = useLevelPreference()
  const { mode, setMode } = useThemeMode()

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
          title='Appearance'
          description='Pick a color theme and your light/dark preference. Every theme adapts to both.'
        >
          <Stack spacing={2}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              size='small'
              onChange={(_, v: ThemeMode | null) => v && setMode(v)}
              aria-label='Light or dark mode'
            >
              <ToggleButton value='light'>Light</ToggleButton>
              <ToggleButton value='system'>System</ToggleButton>
              <ToggleButton value='dark'>Dark</ToggleButton>
            </ToggleButtonGroup>
            <ThemePicker />
          </Stack>
        </SectionCard>

        <SectionCard
          title='Languages'
          description='Pick what to learn, its regional variant, and the language you answer in.'
        >
          <LanguagePairPicker />
        </SectionCard>

        <SectionCard
          title='Difficulty level'
          description='Controls the complexity of sentences. You can also change this on the practice card.'
        >
          <FormControl size='small' sx={{ minWidth: 240 }}>
            <InputLabel id='settings-level-label'>Level</InputLabel>
            <Select
              labelId='settings-level-label'
              label='Level'
              value={pref ?? ''}
              onChange={(e) => setPref(e.target.value || null)}
            >
              <MenuItem value=''>Any level</MenuItem>
              {LEVELS.map((l) => (
                <MenuItem key={l.code} value={l.code}>
                  {levelLabel(l.code)}
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
