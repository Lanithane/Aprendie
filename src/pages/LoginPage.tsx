import { Button, Container, Stack, Typography } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'

export default function LoginPage() {
  return (
    <Container maxWidth='xs' sx={{ pt: 12 }}>
      <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Typography variant='h3'>Guess &amp; Correct</Typography>
        <Typography color='text.secondary'>
          Practice translating Spanish sentences. Sign in to begin.
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
