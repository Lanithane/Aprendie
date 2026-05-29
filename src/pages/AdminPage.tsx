import { Box, Typography, Alert } from '@mui/material'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import UsersTable from '../components/Admin/UsersTable'
import { useAdminUsers } from '../hooks/useAdminUsers'

export default function AdminPage() {
  const { users, loading, error, setRole, revokeKey, revalidateKey } = useAdminUsers()

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 2 }}>
        Admin
      </Typography>
      <Typography color='text.secondary' sx={{ mb: 3 }}>
        Manage accounts and API-key support. {users.length} user{users.length === 1 ? '' : 's'}.
      </Typography>
      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <UsersTable
          users={users}
          onSetRole={setRole}
          onRevokeKey={revokeKey}
          onRevalidateKey={revalidateKey}
        />
      )}
    </Box>
  )
}
