import { Alert, Button, Container, Stack, styled, Typography } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import { useTranslation } from 'react-i18next'
import BrandWordmark from '../components/Brand/BrandWordmark'
import { useAuth } from '../auth/AuthContext'

const LoginContainer = styled(Container)(({ theme }) => ({
  minHeight: '100dvh',
  paddingTop: theme.spacing(10),
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.up('sm')]: {
    paddingTop: theme.spacing(14),
  },
}))

const LoginContent = styled(Stack)`
  align-items: center;
  text-align: center;
`

const SessionExpiredAlert = styled(Alert)`
  width: 100%;
`

const TaglineText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}))

const AnthropicAttribution = styled('div')`
  width: 100%;
  margin-top: auto;
  padding-bottom: ${({ theme }) => theme.spacing(1)};
  text-align: center;
`

const PoweredByText = styled(Typography)`
  color: #d97757;
  opacity: 0.9;
`

export default function LoginPage() {
  const { t } = useTranslation()
  const { sessionExpired } = useAuth()
  return (
    <LoginContainer maxWidth='xs'>
      <LoginContent spacing={2}>
        <BrandWordmark size='login' />
        {sessionExpired && (
          <SessionExpiredAlert severity='info'>
            {t('login.sessionExpired')}
          </SessionExpiredAlert>
        )}
        <TaglineText>{t('login.tagline')}</TaglineText>
        <Button
          variant='contained'
          size='large'
          startIcon={<GoogleIcon />}
          component='a'
          href='/api/auth/google'
        >
          {t('login.signInGoogle')}
        </Button>
      </LoginContent>
      <AnthropicAttribution>
        <PoweredByText variant='caption'>{t('login.poweredBy')}</PoweredByText>
      </AnthropicAttribution>
    </LoginContainer>
  )
}
