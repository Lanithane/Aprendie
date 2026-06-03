import { Box, Typography } from '@mui/material'

// A single labeled headline stat (big value + caption), used in the metrics totals rows.
export default function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant='h5' sx={{ lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography variant='caption' color='text.secondary'>
        {label}
      </Typography>
    </Box>
  )
}
