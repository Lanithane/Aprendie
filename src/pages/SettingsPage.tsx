import { Typography, Box } from '@mui/material'

export default function SettingsPage() {
  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 2 }}>
        Settings
      </Typography>
      <Typography color='text.secondary'>
        Locale picker, API key management, sign-out — coming next.
      </Typography>
    </Box>
  )
}
