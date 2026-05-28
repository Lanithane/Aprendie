import { Container, Typography } from '@mui/material'

export default function App() {
  return (
    <Container maxWidth='md' sx={{ pt: 4 }}>
      <Typography variant='h4'>Guess &amp; Correct</Typography>
      <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
        Spanish learning tool — scaffold up; auth and practice loop next.
      </Typography>
    </Container>
  )
}
