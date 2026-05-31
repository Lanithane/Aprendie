import { Card, CardContent, Typography, Stack, Avatar } from '@mui/material'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import BlockIcon from '@mui/icons-material/Block'
import type { AccessState } from '../../api/userApi'

// Shown in place of Practice when the account may not yet spend the operator key:
// `pending` awaits operator approval, `blocked` has been revoked. Theme-agnostic — reads
// roles off the palette, no hardcoded color.
export default function AccessGate({ access, email }: { access: AccessState; email?: string }) {
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
            {blocked ? 'Access blocked' : 'Your account is awaiting approval'}
          </Typography>
          <Typography color='text.secondary'>
            {blocked
              ? 'Access to practice has been turned off for this account. If you think this is a mistake, reach out to the person who runs this app.'
              : 'Thanks for signing in! Practice opens up once an operator approves your account. You can come back and refresh shortly — your place is saved.'}
          </Typography>
          {email && (
            <Typography variant='caption' color='text.secondary'>
              Signed in as {email}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
