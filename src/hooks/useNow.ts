import { useState } from 'react'

// A render-stable "now" (milliseconds) captured once at mount. Lets components compare against
// timestamps (e.g. a temporary-uncap expiry) without calling the impure `Date.now()` during
// render. Mount-time precision is plenty for these admin views, which are short-lived.
export function useNow(): number {
  const [now] = useState(() => Date.now())
  return now
}
