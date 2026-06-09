import { Box, CircularProgress } from '@mui/material'
import { useTranslation } from 'react-i18next'

export default function LoadingSpinner({ mt = 8 }: { mt?: number }) {
  const { t } = useTranslation()
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt }}>
      <CircularProgress aria-label={t('common.loadingAria')} />
    </Box>
  )
}
