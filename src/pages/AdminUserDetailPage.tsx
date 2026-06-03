import { useState } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Alert,
  Button,
  Stack,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import { format } from 'date-fns'
import SectionCard from '../components/shared/SectionCard'
import DailyLimitSection from '../components/Admin/DailyLimitSection'
import UserHistoryPanel from '../components/Admin/UserHistoryPanel'
import UserMetrics from '../components/Metrics/UserMetrics'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { useAdminContext } from '../components/Admin/AdminLayout'
import { useAuth } from '../auth/AuthContext'
import { formatUsd } from '../components/Contribute/contribute'
import type { UserRole, AccessState } from '../api/userApi'

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { users, loading, error, setRole, setAccess, setCapExempt, setCapOverride, deleteUser } =
    useAdminContext()
  const user = users.find((u) => u.id === id)

  const [busy, setBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

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

  const handleDeleteConfirm = () => {
    setDeleteOpen(false)
    setDeleteConfirm('')
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
          description={`Joined ${format(new Date(user.createdAt), 'MMMM d, yyyy')} · ${formatUsd(
            user.totalCostUsd
          )} operator-key spend (informational)`}
        />

        <UserMetrics source={{ kind: 'user', id: user.id }} />

        <SectionCard title='History' description='Recent practice attempts (read-only).'>
          <UserHistoryPanel userId={user.id} />
        </SectionCard>

        <SectionCard
          title='Delete account'
          description='Permanently removes this user and all their cached sentences and history. Cannot be undone.'
        >
          <Button
            color='error'
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
            disabled={busy}
          >
            {isSelf ? 'Delete my account' : 'Delete user'}
          </Button>
        </SectionCard>
      </Stack>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteConfirm('')
        }}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>Delete account</DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ mb: 2 }}>
            {isSelf ? (
              <>
                You are about to delete your own account. You will be signed out and all your data
                will be permanently removed.
              </>
            ) : (
              <>
                This will permanently delete <strong>{user.name}</strong> ({user.email}) and all
                their cached sentences and history. This cannot be undone.
              </>
            )}
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
            Type <strong>{user.name}</strong> to confirm.
          </Typography>
          <TextField
            autoFocus
            size='small'
            fullWidth
            placeholder={user.name}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && deleteConfirm === user.name) handleDeleteConfirm()
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button
            onClick={() => {
              setDeleteOpen(false)
              setDeleteConfirm('')
            }}
          >
            Cancel
          </Button>
          <Button
            color='error'
            variant='contained'
            disabled={deleteConfirm !== user.name}
            onClick={handleDeleteConfirm}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
