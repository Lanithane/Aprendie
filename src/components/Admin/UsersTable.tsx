import { Fragment, useState } from 'react'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Select,
  MenuItem,
  Chip,
  Button,
  Stack,
  Typography,
  IconButton,
  Collapse,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { format } from 'date-fns'
import UserHistoryPanel from './UserHistoryPanel'
import type { AdminUser, RevalidateResult } from '../../api/adminApi'
import type { UserRole } from '../../api/userApi'

interface UsersTableProps {
  users: AdminUser[]
  onSetRole: (id: string, role: UserRole) => Promise<boolean>
  onRevokeKey: (id: string) => Promise<boolean>
  onRevalidateKey: (id: string) => Promise<RevalidateResult | null>
}

export default function UsersTable({
  users,
  onSetRole,
  onRevokeKey,
  onRevalidateKey,
}: UsersTableProps) {
  return (
    <TableContainer component={Paper} variant='outlined'>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding='checkbox' />
            <TableCell>User</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>API key</TableCell>
            <TableCell>Joined</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              onSetRole={onSetRole}
              onRevokeKey={onRevokeKey}
              onRevalidateKey={onRevalidateKey}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

interface UserTableRowProps {
  user: AdminUser
  onSetRole: (id: string, role: UserRole) => Promise<boolean>
  onRevokeKey: (id: string) => Promise<boolean>
  onRevalidateKey: (id: string) => Promise<RevalidateResult | null>
}

function UserTableRow({ user, onSetRole, onRevokeKey, onRevalidateKey }: UserTableRowProps) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<RevalidateResult | null>(null)
  const [open, setOpen] = useState(false)

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
    void run(() => onSetRole(user.id, role))
  }

  const handleRevoke = () => {
    if (!confirm(`Revoke ${user.email}'s API key? They'll need to re-enter it to keep practicing.`))
      return
    setResult(null)
    void run(() => onRevokeKey(user.id))
  }

  const handleRevalidate = () =>
    void run(async () => {
      setResult(await onRevalidateKey(user.id))
    })

  return (
    <Fragment>
      <TableRow>
        <TableCell padding='checkbox'>
          <IconButton
            size='small'
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label='Show history'
          >
            <ExpandMoreIcon
              sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
            />
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant='body2'>{user.name}</Typography>
          <Typography variant='caption' color='text.secondary'>
            {user.email}
          </Typography>
        </TableCell>
        <TableCell>
          <Select
            size='small'
            value={user.role}
            disabled={busy}
            onChange={(e) => handleRole(e.target.value)}
          >
            <MenuItem value='user'>User</MenuItem>
            <MenuItem value='admin'>Admin</MenuItem>
          </Select>
        </TableCell>
        <TableCell>
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
            <Chip size='small' variant='outlined' label='No key' />
          )}
        </TableCell>
        <TableCell>
          <Typography variant='caption' color='text.secondary'>
            {format(new Date(user.createdAt), 'MMM d, yyyy')}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} sx={{ py: 0, border: 0 }}>
          <Collapse in={open} unmountOnExit>
            {open && <UserHistoryPanel userId={user.id} />}
          </Collapse>
        </TableCell>
      </TableRow>
    </Fragment>
  )
}
