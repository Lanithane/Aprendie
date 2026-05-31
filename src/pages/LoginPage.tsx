import { Button, Container, Stack, Typography } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import BrandWordmark from '../components/Brand/BrandWordmark'

export default function LoginPage() {
  return (
    <Container maxWidth='xs' sx={{ pt: { xs: 10, sm: 14 } }}>
      <Stack spacing={3.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <BrandWordmark size='login' />
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
      </Stack>
    </Container>
  )
}
