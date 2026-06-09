import { Alert, Button, Container, Stack, Typography } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import { useTranslation } from 'react-i18next'
import BrandWordmark from '../components/Brand/BrandWordmark'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { t } = useTranslation()
  const { sessionExpired } = useAuth()
  return (
    <Container maxWidth='xs' sx={{ pt: { xs: 10, sm: 14 } }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <BrandWordmark size='login' />
        {sessionExpired && (
          <Alert severity='info' sx={{ width: '100%' }}>
            {t('login.sessionExpired')}
          </Alert>
        )}
        <Typography color='text.secondary'>{t('login.tagline')}</Typography>
        <Button
          variant='contained'
          size='large'
          startIcon={<GoogleIcon />}
          component='a'
          href='/api/auth/google'
        >
          {t('login.signInGoogle')}
        </Button>
        <Typography variant='caption' color='text.secondary'>
          {t('login.poweredBy')}
        </Typography>
      </Stack>
    </Container>
  )
}
