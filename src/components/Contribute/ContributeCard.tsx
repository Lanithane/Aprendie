import { Stack, Typography, Button, Box } from '@mui/material'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import { useTranslation } from 'react-i18next'
import SectionCard from '../shared/SectionCard'
import { useShowback } from '../../hooks/useShowback'
import { OFFSET_URL, SUPPORT_URL, formatUsd, formatWater } from './contribute'

// The Settings-page equivalent of the sidebar's ContributeSection. Surfaced on mobile (where
// there is no sidebar): the account's usage cost so far, an offset-your-water-footprint link,
// and a support-the-developer link. The two links are config-gated (hidden until their URL is
// set). Renders nothing until showback has loaded.
export default function ContributeCard({ userId }: { userId: string | undefined }) {
  const { t } = useTranslation()
  const { showback } = useShowback(userId)
  if (!showback) return null

  const usd = formatUsd(showback.totalCostUsd)
  const water = formatWater(showback.estimate.waterMl)

  return (
    <SectionCard title={t('contribute.cardTitle')} description={t('contribute.cardDesc')}>
      <Stack spacing={2}>
        <Box>
          <Typography variant='h6'>{usd}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {t('contribute.spentSoFar', { water })}
          </Typography>
        </Box>
        <Stack direction='row' spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {OFFSET_URL && (
            <Button
              variant='outlined'
              startIcon={<WaterDropOutlinedIcon />}
              component='a'
              href={OFFSET_URL}
              target='_blank'
              rel='noopener noreferrer'
            >
              {t('contribute.offsetFootprint')}
            </Button>
          )}
          {SUPPORT_URL && (
            <Button
              variant='contained'
              startIcon={<FavoriteBorderIcon />}
              component='a'
              href={SUPPORT_URL}
              target='_blank'
              rel='noopener noreferrer'
            >
              {t('contribute.support')}
            </Button>
          )}
        </Stack>
      </Stack>
    </SectionCard>
  )
}
