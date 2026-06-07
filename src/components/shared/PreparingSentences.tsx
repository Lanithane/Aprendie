import { Stack, Typography, CircularProgress } from '@mui/material'

// Friendly "we're generating" state for a cold pool — shown while onboarding warms the chosen slice
// and as the practice page's first-load state. Replaces a bare spinner so a few-second cold-start
// reads as working, not stuck.
export default function PreparingSentences() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 6 }}>
      <CircularProgress aria-hidden='true' />
      <Typography variant='h6'>Preparing your first few sentences…</Typography>
      <Typography variant='body2' color='text.secondary'>
        This only takes a few seconds the first time.
      </Typography>
    </Stack>
  )
}
