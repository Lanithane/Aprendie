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
  Switch,
  FormControlLabel,
} from '@mui/material'
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined'
import ShieldIcon from '@mui/icons-material/Shield'
import { useTranslation } from 'react-i18next'
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
import { useStreakPreference } from '../hooks/useStreakPreference'
import { useStreak } from '../streak/StreakContext'
import { useThemeMode, type ThemeMode } from '../ThemeModeProvider'
import { useLevelLabel } from '../hooks/useLevelLabel'
import { LEVELS } from '../../shared/levels'

export default function SettingsPage() {
  const { t } = useTranslation()
  const levelLabel = useLevelLabel()
  const { user, isAdmin } = useAuth()
  const { pref, setPref } = useLevelPreference()
  const { enabled: streakEnabled, setEnabled: setStreakEnabled } = useStreakPreference()
  const { streak } = useStreak()
  const { mode, setMode } = useThemeMode()
  const { openFeedback } = useFeedback()

  return (
    <Box>
      <Typography variant='h3' sx={{ mb: 2 }}>
        {t('settings.title')}
      </Typography>
      <Stack spacing={2}>
        {isAdmin && (
          <Button
            variant='contained'
            color='primary'
            startIcon={<ShieldIcon />}
            component={RouterLink}
            to={ADMIN_NAV_ITEM.to}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('nav.admin')}
          </Button>
        )}
        <SectionCard
          title={t('settings.appearanceTitle')}
          description={t('settings.appearanceDesc')}
        >
          <Stack spacing={2}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              size='small'
              onChange={(_, v: ThemeMode | null) => v && setMode(v)}
              aria-label={t('settings.modeAria')}
            >
              <ToggleButton value='light'>{t('common.light')}</ToggleButton>
              <ToggleButton value='system'>{t('common.system')}</ToggleButton>
              <ToggleButton value='dark'>{t('common.dark')}</ToggleButton>
            </ToggleButtonGroup>
            <ThemePicker />
          </Stack>
        </SectionCard>

        <SectionCard title={t('settings.languagesTitle')} description={t('settings.languagesDesc')}>
          <LanguagePairPicker />
        </SectionCard>

        <SectionCard
          title={t('settings.difficultyTitle')}
          description={t('settings.difficultyDesc')}
        >
          <FormControl size='small' sx={{ minWidth: 240 }}>
            <InputLabel id='settings-level-label'>{t('settings.level')}</InputLabel>
            <Select
              labelId='settings-level-label'
              label={t('settings.level')}
              value={pref ?? ''}
              onChange={(e) => setPref(e.target.value || null)}
            >
              <MenuItem value=''>{t('common.anyLevel')}</MenuItem>
              {LEVELS.map((l) => (
                <MenuItem key={l.code} value={l.code}>
                  {levelLabel(l.code)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </SectionCard>

        <SectionCard
          title={t('settings.pronunciationTitle')}
          description={t('settings.pronunciationDesc')}
        >
          <Stack spacing={2}>
            <VoicePicker />
            <AutoSpeakControls />
          </Stack>
        </SectionCard>

        <SectionCard title={t('settings.streakTitle')} description={t('settings.streakDesc')}>
          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={streakEnabled}
                  onChange={(e) => setStreakEnabled(e.target.checked)}
                />
              }
              label={t('settings.trackMyStreak')}
            />
            {streakEnabled && (streak.current > 0 || streak.longest > 0) && (
              <Typography variant='body2' color='text.secondary'>
                {t('settings.streakSummary', {
                  current: t('common.dayCount', { count: streak.current }),
                  longest: t('common.dayCount', { count: streak.longest }),
                })}
              </Typography>
            )}
          </Stack>
        </SectionCard>

        <ContributeCard userId={user?.id} />

        <SectionCard title={t('settings.feedbackTitle')} description={t('settings.feedbackDesc')}>
          <Button variant='contained' startIcon={<FeedbackOutlinedIcon />} onClick={openFeedback}>
            {t('settings.sendFeedback')}
          </Button>
        </SectionCard>

        <SectionCard title={t('settings.accountTitle')} description={user?.email}>
          <Box sx={{ mt: 2 }}>
            <Button
              color='secondary'
              component='a'
              href='/api/auth/logout'
              onClick={clearSessionMarker}
            >
              {t('settings.signOut')}
            </Button>
          </Box>
        </SectionCard>
      </Stack>
    </Box>
  )
}
