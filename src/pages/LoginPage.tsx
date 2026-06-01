import { Alert, Button, Container, Stack, Typography } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import BrandWordmark from '../components/Brand/BrandWordmark'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { sessionExpired } = useAuth()
  return (
    <Container maxWidth='xs' sx={{ pt: { xs: 10, sm: 14 } }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <BrandWordmark size='login' />
        {sessionExpired && (
          <Alert severity='info' sx={{ width: '100%' }}>
            Your session expired after 30 days of inactivity. Please sign in again.
          </Alert>
        )}
        <Typography color='text.secondary'>
          Practice translating sentences and get instant, friendly corrections.
        </Typography>
        <Button
          variant='contained'
          size='large'
          startIcon={<GoogleIcon />}
          component='a'
          href='/api/auth/google'
        >
          Sign in with Google
        </Button>
        <Typography variant='caption' color='text.secondary'>
          Powered by Anthropic AI
        </Typography>
      </Stack>
    </Container>
  )
}
