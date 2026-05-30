import { Box, CircularProgress } from '@mui/material'

export default function LoadingSpinner({ mt = 8 }: { mt?: number }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt }}>
      <CircularProgress aria-label='Loading' />
    </Box>
  )
}
