import { Alert, AlertTitle } from '@mui/material'
import { useDailyUsage } from '../../usage/DailyUsageContext'

// Show the warning once the learner has used at least this fraction of today's cap.
const NEAR_CAP_RATIO = 0.75

// Persistent practice-screen notice for capped learners: an amber heads-up as they approach the
// daily graded-sentence cap, switching to a red "you're done for today" once they hit it. Renders
// nothing for accounts with no cap (admins/exempt) or anyone still comfortably under the threshold,
// so it only appears when it has something to say. The cap resets on the UTC calendar day (see the
// server's usage bucket), which the at-cap copy spells out.
export default function DailyCapBanner() {
  const { usage } = useDailyUsage()
  if (!usage || !usage.capped) return null

  const { usedToday, cap } = usage
  const atCap = usedToday >= cap
  const nearCap = usedToday >= Math.ceil(cap * NEAR_CAP_RATIO)
  if (!atCap && !nearCap) return null

  const remaining = Math.max(0, cap - usedToday)
  const noun = remaining === 1 ? 'sentence' : 'sentences'
  const title = atCap ? "That's today's limit" : 'Nearing your daily limit'
  const detail = atCap
    ? `You've used all ${cap} of today's graded sentences. It resets at midnight UTC.`
    : `${remaining} of ${cap} graded ${noun} left today.`

  return (
    <Alert severity={atCap ? 'error' : 'warning'} sx={{ mb: 2 }}>
      <AlertTitle>{title}</AlertTitle>
      {detail}
    </Alert>
  )
}
