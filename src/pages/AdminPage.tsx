import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Alert,
  Button,
  Stack,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Avatar,
} from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import LimitsPanel from '../components/Admin/LimitsPanel'
import { useAdminContext } from '../components/Admin/AdminLayout'
import { useNow } from '../hooks/useNow'
import { scoreColor } from '../theme/scoreColor'

// Admin landing: a tappable list of accounts. Each opens a detail route to edit the user.
export default function AdminPage() {
  const { users, loading, error, reload } = useAdminContext()
  const now = useNow()

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 2 }}>
        Admin
      </Typography>
      <Typography color='text.secondary' sx={{ mb: 3 }}>
        Manage accounts and spend. {users.length} user{users.length === 1 ? '' : 's'}.
      </Typography>
      <Box sx={{ mb: 3 }}>
        <LimitsPanel users={users} />
      </Box>
      {error && (
        <Stack spacing={2} sx={{ mb: 2, alignItems: 'flex-start' }}>
          <Alert severity='error' sx={{ width: '100%' }}>
            {error}
          </Alert>
          <Button color='secondary' size='small' onClick={() => void reload()}>
            Try again
          </Button>
        </Stack>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Stack spacing={1}>
          {users.map((user) => (
            <Card key={user.id} variant='outlined'>
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
                      <Stack direction='row' spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap' }}>
                        {user.capExemptUntil && new Date(user.capExemptUntil).getTime() > now ? (
                          <Chip size='small' variant='outlined' color='info' label='uncapped' />
                        ) : (
                          <Chip
                            size='small'
                            variant='outlined'
                            color={scoreColor(
                              100 - (user.usedToday / Math.max(user.effectiveCap, 1)) * 100
                            )}
                            label={`${user.usedToday}/${user.effectiveCap}`}
                          />
                        )}
                        <Chip
                          size='small'
                          label={user.role}
                          color={user.role === 'admin' ? 'primary' : 'default'}
                        />
                        <Chip
                          size='small'
                          variant={user.access === 'approved' ? 'filled' : 'outlined'}
                          label={user.access}
                          color={
                            user.access === 'approved'
                              ? 'success'
                              : user.access === 'blocked'
                                ? 'error'
                                : 'warning'
                          }
                        />
                      </Stack>
                    </Box>
                    <ChevronRightIcon sx={{ color: 'action.active', flexShrink: 0 }} />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  )
}
