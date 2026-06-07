import { useEffect, useState } from 'react'

// Returns true only once `active` has stayed continuously true for `delayMs`, and falls back to
// false the instant `active` clears. Used to gate loading UI on quick operations: a fetch that
// resolves inside the delay window never flips the flag, so no spinner/placeholder flashes on
// fast loads (a cached/parked sentence, a warm pool). A genuinely slow load crosses the threshold
// and reveals the loader as usual.
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false)

  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setElapsed(true), delayMs)
    // Cleanup runs when `active` clears (or on unmount), resetting the flag so the next activation
    // starts the delay over — keeping the reset out of the effect body avoids a cascading render.
    return () => {
      clearTimeout(timer)
      setElapsed(false)
    }
  }, [active, delayMs])

  return active && elapsed
}
