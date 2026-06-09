import { Card, CardContent, Typography, Stack, Avatar } from '@mui/material'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import BlockIcon from '@mui/icons-material/Block'
import { useTranslation } from 'react-i18next'
import type { AccessState } from '../../api/userApi'

// Shown in place of Practice when the account may not yet spend the operator key:
// `pending` awaits operator approval, `blocked` has been revoked. Theme-agnostic — reads
// roles off the palette, no hardcoded color.
export default function AccessGate({ access, email }: { access: AccessState; email?: string }) {
  const { t } = useTranslation()
  const blocked = access === 'blocked'
  return (
    <Card sx={{ maxWidth: 540, mx: 'auto' }}>
      <CardContent>
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
          <Avatar
            sx={{
              bgcolor: blocked ? 'errorContainer' : 'secondaryContainer',
              color: blocked ? 'onErrorContainer' : 'onSecondaryContainer',
              width: 56,
              height: 56,
            }}
          >
            {blocked ? <BlockIcon /> : <HourglassEmptyIcon />}
          </Avatar>
          <Typography variant='h5'>
            {blocked ? t('accessGate.blockedTitle') : t('accessGate.pendingTitle')}
          </Typography>
          <Typography color='text.secondary'>
            {blocked ? t('accessGate.blockedDetail') : t('accessGate.pendingDetail')}
          </Typography>
          {email && (
            <Typography variant='caption' color='text.secondary'>
              {t('accessGate.signedInAs', { email })}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
