import { useState } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Typography, Alert, Button, Stack, Select, MenuItem } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import { format } from 'date-fns'
import SectionCard from '../components/shared/SectionCard'
import DailyLimitSection from '../components/Admin/DailyLimitSection'
import UserHistoryPanel from '../components/Admin/UserHistoryPanel'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { useAdminContext } from '../components/Admin/AdminLayout'
import { useAuth } from '../auth/AuthContext'
import type { UserRole, AccessState } from '../api/userApi'

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { users, loading, error, setRole, setAccess, setCapExempt, setCapOverride, deleteUser } =
    useAdminContext()
  const user = users.find((u) => u.id === id)

  const [busy, setBusy] = useState(false)

  const back = (
    <Button
      color='tertiary'
      component={RouterLink}
      to='/admin'
      startIcon={<ArrowBackIcon />}
      sx={{ mb: 2 }}
    >
      All users
    </Button>
  )

  if (loading) return <LoadingSpinner />
  if (!user)
    return (
      <Box>
        {back}
        <Alert severity='warning'>User not found.</Alert>
      </Box>
    )

  const run = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setBusy(true)
    try {
      return await fn()
    } finally {
      setBusy(false)
    }
  }

  const handleRole = (role: UserRole) => {
    if (role === user.role) return
    void run(() => setRole(user.id, role))
  }

  const handleAccess = (access: AccessState) => {
    if (access === user.access) return
    void run(() => setAccess(user.id, access))
  }

  const isSelf = currentUser?.id === user.id

  const handleDelete = () => {
    const message = isSelf
      ? `Delete your OWN account (${user.email})? You'll be signed out. Signing back in creates a fresh account, which is how you re-test the new-user flow.`
      : `Permanently delete ${user.email} and all their cached sentences and history? This cannot be undone.`
    if (!confirm(message)) return
    void run(async () => {
      if (!(await deleteUser(user.id))) return
      // A self-delete invalidates the session, so hard-navigate: /api/me then 401s
      // and the app drops to the login screen — a clean entry point to re-onboard.
      if (isSelf) window.location.href = '/'
      else void navigate('/admin')
    })
  }

  return (
    <Box>
      {back}
      <Typography variant='h4'>{user.name}</Typography>
      <Typography color='text.secondary' sx={{ mb: 3 }}>
        {user.email}
      </Typography>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        <SectionCard title='Role' description='Admins can manage all accounts.'>
          <Select
            size='small'
            value={user.role}
            disabled={busy}
            onChange={(e) => handleRole(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value='user'>User</MenuItem>
            <MenuItem value='admin'>Admin</MenuItem>
          </Select>
        </SectionCard>

        <SectionCard
          title='Access'
          description='Approved accounts may practice on the operator key. Pending accounts wait at a holding screen; blocked accounts are turned off.'
        >
          <Select
            size='small'
            value={user.access}
            disabled={busy}
            onChange={(e) => handleAccess(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value='pending'>Pending</MenuItem>
            <MenuItem value='approved'>Approved</MenuItem>
            <MenuItem value='blocked'>Blocked</MenuItem>
          </Select>
        </SectionCard>

        <DailyLimitSection
          user={user}
          busy={busy}
          setCapExempt={(id, until) => run(() => setCapExempt(id, until))}
          setCapOverride={(id, cap) => run(() => setCapOverride(id, cap))}
        />

        <SectionCard
          title='Account'
          description={`Joined ${format(new Date(user.createdAt), 'MMMM d, yyyy')}`}
        />

        <SectionCard title='History' description='Recent practice attempts (read-only).'>
          <UserHistoryPanel userId={user.id} />
        </SectionCard>

        <SectionCard
          title='Delete account'
          description='Permanently removes this user and all their cached sentences and history. Cannot be undone.'
        >
          <Button color='error' startIcon={<DeleteIcon />} onClick={handleDelete} disabled={busy}>
            {isSelf ? 'Delete my account' : 'Delete user'}
          </Button>
        </SectionCard>
      </Stack>
    </Box>
  )
}
