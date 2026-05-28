import { Typography, Box } from '@mui/material'

export default function HomePage() {
  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 2 }}>
        Practice
      </Typography>
      <Typography color='text.secondary'>
        The Spanish sentence + input box will land here.
      </Typography>
    </Box>
  )
}
