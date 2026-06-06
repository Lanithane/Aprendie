import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Stack,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Avatar,
} from '@mui/material'
import type { ChipProps } from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type { AdminUser } from '../../api/adminApi'
import { formatUsd } from '../Contribute/contribute'

function capUsageColor(used: number, cap: number): NonNullable<ChipProps['color']> {
  if (cap <= 0 || used >= cap) return 'error'
  if (used / cap >= 0.8) return 'warning'
  return 'success'
}

// A single tappable account row in the admin lists. Opens the detail route to edit the
// user. Approval status is conveyed by which list the card lives in, not a chip.
export default function UserListCard({ user, now }: { user: AdminUser; now: number }) {
  return (
    <Card variant='outlined'>
      <CardActionArea component={RouterLink} to={`users/${user.id}`}>
        <CardContent>
          <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar
              sx={{
                bgcolor: 'secondaryContainer',
                color: 'onSecondaryContainer',
                fontSize: '1.25rem',
                width: 56,
                height: 56,
              }}
            >
              {(user.name || user.email).charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap>{user.name}</Typography>
              <Typography variant='caption' noWrap sx={{ display: 'block' }}>
                {user.email}
              </Typography>
              <Stack direction='row' useFlexGap sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                {user.capExemptUntil && new Date(user.capExemptUntil).getTime() > now ? (
                  <Chip size='small' variant='outlined' color='info' label='today: uncapped' />
                ) : (
                  <Chip
                    size='small'
                    variant='outlined'
                    color={capUsageColor(user.usedToday, user.effectiveCap)}
                    label={`today: ${user.usedToday}/${user.effectiveCap}`}
                  />
                )}
                <Chip
                  size='small'
                  variant='outlined'
                  label={`lifetime: ${user.usedLifetime} · ${formatUsd(user.totalCostUsd)}`}
                />
                <Chip
                  size='small'
                  variant='outlined'
                  label={user.role}
                  color={user.role === 'admin' ? 'primary' : 'default'}
                />
              </Stack>
            </Box>
            <ChevronRightIcon sx={{ color: 'action.active', flexShrink: 0 }} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
