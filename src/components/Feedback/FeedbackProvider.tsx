import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import FeedbackDialog from './FeedbackDialog'

interface FeedbackContextValue {
  openFeedback: () => void
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

// Owns the single feedback dialog and exposes `openFeedback()` so any trigger (the sidebar
// rail on desktop, the Settings button everywhere) opens the same dialog. Mounted once under
// the router so the dialog can read the active route as page context.
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openFeedback = useCallback(() => setOpen(true), [])
  const closeFeedback = useCallback(() => setOpen(false), [])

  const value = useMemo(() => ({ openFeedback }), [openFeedback])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackDialog open={open} onClose={closeFeedback} />
    </FeedbackContext.Provider>
  )
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback must be used within a FeedbackProvider')
  return ctx
}
