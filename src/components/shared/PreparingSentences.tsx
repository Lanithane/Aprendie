import { Stack, Typography, CircularProgress } from '@mui/material'
import { useTranslation } from 'react-i18next'

// Friendly "we're generating" state for a cold pool — shown while onboarding warms the chosen slice
// and as the practice page's first-load state. Replaces a bare spinner so a few-second cold-start
// reads as working, not stuck.
export default function PreparingSentences() {
  const { t } = useTranslation()
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 6 }}>
      <CircularProgress aria-hidden='true' />
      <Typography variant='h6'>{t('preparing.title')}</Typography>
      <Typography variant='body2' color='text.secondary'>
        {t('preparing.subtitle')}
      </Typography>
    </Stack>
  )
}
