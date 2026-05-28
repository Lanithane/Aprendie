import { Typography, Box } from '@mui/material'

export default function HistoryPage() {
  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 2 }}>
        History
      </Typography>
      <Typography color='text.secondary'>
        Past attempts (stored in localStorage) — list view coming next.
      </Typography>
    </Box>
  )
}
