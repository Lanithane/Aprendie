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
import { useAdminContext } from '../components/Admin/AdminLayout'

// Admin landing: a tappable list of accounts. Each opens a detail route to edit the user.
export default function AdminPage() {
  const { users, loading, error, reload } = useAdminContext()

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 2 }}>
        Admin
      </Typography>
      <Typography color='text.secondary' sx={{ mb: 3 }}>
        Manage accounts and API-key support. {users.length} user{users.length === 1 ? '' : 's'}.
      </Typography>
      {error && (
        <Stack spacing={2} sx={{ mb: 2, alignItems: 'flex-start' }}>
          <Alert severity='error' sx={{ width: '100%' }}>
            {error}
          </Alert>
          <Button variant='outlined' size='small' onClick={() => void reload()}>
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
                        fontSize: '1rem',
                      }}
                    >
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap>{user.name}</Typography>
                      <Typography variant='caption' noWrap sx={{ display: 'block' }}>
                        {user.email}
                      </Typography>
                    </Box>
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
