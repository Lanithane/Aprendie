import { useState } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Typography, Alert, Button, Stack, Select, MenuItem, Chip } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import { format } from 'date-fns'
import SectionCard from '../components/shared/SectionCard'
import UserHistoryPanel from '../components/Admin/UserHistoryPanel'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { useAdminContext } from '../components/Admin/AdminLayout'
import { useAuth } from '../auth/AuthContext'
import type { RevalidateResult } from '../api/adminApi'
import type { UserRole } from '../api/userApi'

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { users, loading, error, setRole, revokeKey, revalidateKey, deleteUser } = useAdminContext()
  const user = users.find((u) => u.id === id)

  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<RevalidateResult | null>(null)

  const back = (
    <Button component={RouterLink} to='/admin' startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
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

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  const handleRole = (role: UserRole) => {
    if (role === user.role) return
    void run(() => setRole(user.id, role))
  }

  const handleRevoke = () => {
    if (!confirm(`Revoke ${user.email}'s API key? They'll need to re-enter it to keep practicing.`))
      return
    setResult(null)
    void run(() => revokeKey(user.id))
  }

  const handleRevalidate = () =>
    void run(async () => {
      setResult(await revalidateKey(user.id))
    })

  const isSelf = currentUser?.id === user.id

  const handleDelete = () => {
    const message = isSelf
      ? `Delete your OWN account (${user.email})? You'll be signed out — signing back in creates a fresh account, which is how you re-test the new-user flow.`
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
        <SectionCard title='Role' description='Admins can manage all accounts and API-key support.'>
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
          title='API key'
          description='Re-validate pings Anthropic with the stored key; revoke clears it. The key is never shown.'
        >
          {user.hasApiKey ? (
            <Stack direction='row' spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip size='small' color='success' label='Key set' />
              <Button size='small' onClick={handleRevalidate} disabled={busy}>
                Re-validate
              </Button>
              <Button size='small' color='error' onClick={handleRevoke} disabled={busy}>
                Revoke
              </Button>
              {result && (
                <Chip
                  size='small'
                  variant='outlined'
                  color={result.ok ? 'success' : 'error'}
                  label={result.ok ? 'Valid' : (result.reason ?? 'Invalid')}
                />
              )}
            </Stack>
          ) : (
            <Chip size='small' variant='outlined' label='No key set' />
          )}
        </SectionCard>

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
          <Button
            color='error'
            variant='outlined'
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            disabled={busy}
          >
            {isSelf ? 'Delete my account' : 'Delete user'}
          </Button>
        </SectionCard>
      </Stack>
    </Box>
  )
}
