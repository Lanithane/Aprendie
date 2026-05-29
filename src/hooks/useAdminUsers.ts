import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import {
  fetchUsers,
  setUserRole as apiSetUserRole,
  revokeUserKey as apiRevokeUserKey,
  revalidateUserKey as apiRevalidateUserKey,
  type AdminUser,
  type RevalidateResult,
} from '../api/adminApi'
import type { UserRole } from '../api/userApi'

interface UseAdminUsersResult {
  users: AdminUser[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  setRole: (id: string, role: UserRole) => Promise<boolean>
  revokeKey: (id: string) => Promise<boolean>
  revalidateKey: (id: string) => Promise<RevalidateResult | null>
}

export function useAdminUsers(): UseAdminUsersResult {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await fetchUsers())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const setRole = useCallback(async (id: string, role: UserRole) => {
    setError(null)
    try {
      const updated = await apiSetUserRole(id, role)
      setUsers((cur) => cur.map((u) => (u.id === id ? updated : u)))
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update role')
      return false
    }
  }, [])

  const revokeKey = useCallback(async (id: string) => {
    setError(null)
    try {
      await apiRevokeUserKey(id)
      setUsers((cur) => cur.map((u) => (u.id === id ? { ...u, hasApiKey: false } : u)))
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to revoke key')
      return false
    }
  }, [])

  const revalidateKey = useCallback(async (id: string) => {
    setError(null)
    try {
      return await apiRevalidateUserKey(id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to re-validate key')
      return null
    }
  }, [])

  return { users, loading, error, reload, setRole, revokeKey, revalidateKey }
}
