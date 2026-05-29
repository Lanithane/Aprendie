import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ApiError } from '../api/client'
import { fetchCurrentUser, type CurrentUserDto } from '../api/userApi'

export type CurrentUser = CurrentUserDto

interface AuthState {
  user: CurrentUser | null
  isAdmin: boolean
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      setUser(await fetchCurrentUser())
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null)
      } else {
        console.error('[auth] /api/me failed:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch the current user once on mount; refresh() owns its own loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'admin', loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
