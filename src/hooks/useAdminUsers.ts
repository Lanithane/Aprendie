import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import {
  fetchUsers,
  setUserRole as apiSetUserRole,
  setUserAccess as apiSetUserAccess,
  setCapExempt as apiSetCapExempt,
  setCapOverride as apiSetCapOverride,
  deleteUser as apiDeleteUser,
  type AdminUser,
} from '../api/adminApi'
import type { UserRole, AccessState } from '../api/userApi'

// How often the list silently refetches so usage stats (e.g. the admin "Graded today"
// tile) track activity without a manual reload. Short-lived admin view, modest cost.
const POLL_INTERVAL_MS = 20_000

interface UseAdminUsersResult {
  users: AdminUser[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  setRole: (id: string, role: UserRole) => Promise<boolean>
  setAccess: (id: string, access: AccessState) => Promise<boolean>
  setCapExempt: (id: string, until: string | null) => Promise<boolean>
  setCapOverride: (id: string, cap: number | null) => Promise<boolean>
  deleteUser: (id: string) => Promise<boolean>
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

  // Pull the latest list without flipping the loading flag, so the background poll
  // updates counts in place instead of flashing the spinner. Transient failures are
  // swallowed — the next tick retries, and the initial reload() surfaces hard errors.
  const refresh = useCallback(async () => {
    try {
      setUsers(await fetchUsers())
    } catch {
      // ignore — keep showing the last good list until the next poll succeeds
    }
  }, [])

  useEffect(() => {
    // Load the user list once on mount; reload() owns its own loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  useEffect(() => {
    // Background-refresh while the tab is visible so stats track activity live. Skip
    // hidden tabs to avoid pointless requests, and catch up once on becoming visible.
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const id = setInterval(tick, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [refresh])

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

  const setAccess = useCallback(async (id: string, access: AccessState) => {
    setError(null)
    try {
      const updated = await apiSetUserAccess(id, access)
      setUsers((cur) => cur.map((u) => (u.id === id ? updated : u)))
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update access')
      return false
    }
  }, [])

  const setCapExempt = useCallback(async (id: string, until: string | null) => {
    setError(null)
    try {
      const updated = await apiSetCapExempt(id, until)
      setUsers((cur) => cur.map((u) => (u.id === id ? updated : u)))
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update uncap')
      return false
    }
  }, [])

  const setCapOverride = useCallback(async (id: string, cap: number | null) => {
    setError(null)
    try {
      const updated = await apiSetCapOverride(id, cap)
      setUsers((cur) => cur.map((u) => (u.id === id ? updated : u)))
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update cap')
      return false
    }
  }, [])

  const deleteUser = useCallback(async (id: string) => {
    setError(null)
    try {
      await apiDeleteUser(id)
      setUsers((cur) => cur.filter((u) => u.id !== id))
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete user')
      return false
    }
  }, [])

  return {
    users,
    loading,
    error,
    reload,
    setRole,
    setAccess,
    setCapExempt,
    setCapOverride,
    deleteUser,
  }
}
