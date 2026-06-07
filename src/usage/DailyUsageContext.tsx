import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchDailyUsage, type DailyUsageDto } from '../api/usageApi'
import { useAuth } from '../auth/AuthContext'

interface DailyUsageState {
  // The learner's daily-cap posture, or null while loading / for accounts with no cap to show
  // (admins, unapproved). The near-cap banner reads this.
  usage: DailyUsageDto | null
  // Adopt a fresher snapshot — the grade endpoints return one in their response, so the banner
  // updates the moment a sentence or flash card counts, without a refetch.
  applySnapshot: (snapshot: DailyUsageDto) => void
}

const DailyUsageContext = createContext<DailyUsageState | null>(null)

export function DailyUsageProvider({ children }: { children: ReactNode }) {
  const { user, isApproved, isAdmin } = useAuth()
  const [usage, setUsage] = useState<DailyUsageDto | null>(null)

  // Capped accounts (approved non-admins) need their standing on load so the banner can warn before
  // they grade this session; admins and unapproved accounts have no cap to surface. Re-runs when the
  // signed-in account or its approval changes.
  useEffect(() => {
    if (!isApproved || isAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsage(null)
      return
    }
    let active = true
    fetchDailyUsage()
      .then((u) => {
        if (active) setUsage(u)
      })
      .catch((err) => console.error('[usage] /api/usage/me failed:', err))
    return () => {
      active = false
    }
  }, [user?.id, isApproved, isAdmin])

  return (
    <DailyUsageContext.Provider value={{ usage, applySnapshot: setUsage }}>
      {children}
    </DailyUsageContext.Provider>
  )
}

export function useDailyUsage() {
  const ctx = useContext(DailyUsageContext)
  if (!ctx) throw new Error('useDailyUsage must be inside DailyUsageProvider')
  return ctx
}
