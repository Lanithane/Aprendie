import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ApiError } from '../api/client'
import { fetchCurrentUser, type CurrentUserDto } from '../api/userApi'
import type { SentenceDto } from '../api/sentenceApi'
import { consumeExpiredSession, rememberSessionExpiry } from './sessionMarker'

export type CurrentUser = CurrentUserDto

interface AuthState {
  user: CurrentUser | null
  isAdmin: boolean
  // May the account spend the operator key? Admins always; everyone else only once
  // approved. Drives the practice gate vs the pending/blocked screen.
  isApproved: boolean
  loading: boolean
  // True when the previous session lapsed (its 30-day window passed) rather than the user
  // never having signed in — the login screen reads this to explain why they're back there.
  sessionExpired: boolean
  refresh: () => Promise<void>
  // First sentence delivered alongside the initial /api/me (perf #5: collapses the
  // /me -> /sentence/next waterfall). Null once consumed or when the pool was cold.
  bootstrapSentence: SentenceDto | null
  consumeBootstrap: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [bootstrapSentence, setBootstrapSentence] = useState<SentenceDto | null>(null)

  // `withBootstrap` only on the initial load — a plain refresh() (after a level/theme/pair
  // change) must not request a sentence, or it would drain a pool sentence per refresh.
  // `silent` skips the global loading gate: a post-write refresh revalidates `user` in the
  // background without unmounting the app behind a spinner (which read as a page flash).
  const load = async (withBootstrap: boolean, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const me = await fetchCurrentUser(withBootstrap ? { bootstrap: true } : undefined)
      setUser(me)
      rememberSessionExpiry(me.sessionExpiresAt)
      if (withBootstrap) setBootstrapSentence(me.bootstrapSentence)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null)
        // A 401 whose mirrored expiry has passed means the 30-day session lapsed — surface
        // it so /login can say so. A never-logged-in visitor has no marker and stays quiet.
        if (consumeExpiredSession()) setSessionExpired(true)
      } else {
        console.error('[auth] /api/me failed:', err)
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const refresh = () => load(false, true)

  useEffect(() => {
    // Fetch the current user once on mount; load() owns its own loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(true)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        isApproved: user?.role === 'admin' || user?.access === 'approved',
        loading,
        sessionExpired,
        refresh,
        bootstrapSentence,
        consumeBootstrap: () => setBootstrapSentence(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
