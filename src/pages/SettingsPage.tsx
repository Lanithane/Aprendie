import {
  Typography,
  Box,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined'
import ShieldIcon from '@mui/icons-material/Shield'
import { Link as RouterLink } from 'react-router-dom'
import { ADMIN_NAV_ITEM } from '../components/AppShell/navigation'
import SectionCard from '../components/shared/SectionCard'
import ContributeCard from '../components/Contribute/ContributeCard'
import { useFeedback } from '../components/Feedback/FeedbackProvider'
import LanguagePairPicker from '../components/LanguagePairPicker/LanguagePairPicker'
import VoicePicker from '../components/VoicePicker/VoicePicker'
import AutoSpeakControls from '../components/AutoSpeakControls/AutoSpeakControls'
import ThemePicker from '../components/ThemePicker/ThemePicker'
import { useAuth } from '../auth/AuthContext'
import { clearSessionMarker } from '../auth/sessionMarker'
import { useLevelPreference } from '../hooks/useLevelPreference'
import { useThemeMode, type ThemeMode } from '../ThemeModeProvider'
import { LEVELS, levelLabel } from '../../shared/levels'

export default function SettingsPage() {
  const { user, isAdmin } = useAuth()
  const { pref, setPref } = useLevelPreference()
  const { mode, setMode } = useThemeMode()
  const { openFeedback } = useFeedback()

  return (
    <Box>
      <Typography variant='h3' sx={{ mb: 2 }}>
        Settings
      </Typography>
      <Stack spacing={2}>
        {isAdmin && (
          <Button
            variant='outlined'
            color='secondary'
            startIcon={<ShieldIcon />}
            component={RouterLink}
            to={ADMIN_NAV_ITEM.to}
            sx={{ alignSelf: 'flex-start' }}
          >
            {ADMIN_NAV_ITEM.label}
          </Button>
        )}
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
          title='Pronunciation'
          description='Choose the voice used to read sentences aloud, and whether new sentences play on their own. Available voices depend on your device.'
        >
          <Stack spacing={2}>
            <VoicePicker />
            <AutoSpeakControls />
          </Stack>
        </SectionCard>

        <ContributeCard userId={user?.id} />

        <SectionCard
          title='Feedback'
          description='Spot a bug or have an idea? Send it straight to the team.'
        >
          <Button variant='contained' startIcon={<FeedbackOutlinedIcon />} onClick={openFeedback}>
            Send feedback
          </Button>
        </SectionCard>

        <SectionCard title='Account' description={user?.email}>
          <Box sx={{ mt: 2 }}>
            <Button
              color='secondary'
              component='a'
              href='/api/auth/logout'
              onClick={clearSessionMarker}
            >
              Sign out
            </Button>
          </Box>
        </SectionCard>
      </Stack>
    </Box>
  )
}
