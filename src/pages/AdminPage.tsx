import { useMemo } from 'react'
import { Box, Typography, Alert, Button, Stack } from '@mui/material'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import LimitsPanel from '../components/Admin/LimitsPanel'
import FeedbackPanel from '../components/Admin/FeedbackPanel'
import AnalyticsPanel from '../components/Admin/AnalyticsPanel'
import SiteMetricsPanel from '../components/Metrics/SiteMetricsPanel'
import UserListCard from '../components/Admin/UserListCard'
import { useAdminContext } from '../components/Admin/AdminLayout'
import { useNow } from '../hooks/useNow'

// Admin landing: tappable account lists. Users awaiting approval are surfaced in their
// own section above the main roster; opening either card routes to the detail editor.
export default function AdminPage() {
  const { users, loading, error, reload } = useAdminContext()
  const now = useNow()

  const { approved, unapproved } = useMemo(
    () => ({
      approved: users.filter((u) => u.access === 'approved'),
      unapproved: users.filter((u) => u.access !== 'approved'),
    }),
    [users]
  )

  return (
    <Box>
      <Typography variant='h3' sx={{ mb: 0.5 }}>
        Admin
      </Typography>
      <Typography color='text.secondary' sx={{ mb: 2 }}>
        Manage accounts and spend. {users.length} user{users.length === 1 ? '' : 's'}.
      </Typography>
      <Box sx={{ mb: 3 }}>
        <LimitsPanel users={users} />
      </Box>
      <Stack spacing={3} sx={{ mb: 3 }}>
        <SiteMetricsPanel />
        <AnalyticsPanel />
        <FeedbackPanel />
      </Stack>
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
      <Typography variant='h6' sx={{ mb: 1 }}>
        Awaiting approval
      </Typography>
      {loading ? (
        <LoadingSpinner />
      ) : unapproved.length === 0 ? (
        <Typography color='text.secondary' sx={{ mb: 3 }}>
          All users approved.
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mb: 3 }}>
          {unapproved.map((user) => (
            <UserListCard key={user.id} user={user} now={now} />
          ))}
        </Stack>
      )}
      <Typography variant='h6' sx={{ mb: 1 }}>
        Users
      </Typography>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Stack spacing={1}>
          {approved.map((user) => (
            <UserListCard key={user.id} user={user} now={now} />
          ))}
        </Stack>
      )}
    </Box>
  )
}
