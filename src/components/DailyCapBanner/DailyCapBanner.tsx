import { Alert, AlertTitle } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useDailyUsage } from '../../usage/DailyUsageContext'

// Show the warning once the learner has used at least this fraction of today's cap.
const NEAR_CAP_RATIO = 0.75

// Persistent practice-screen notice for capped learners: an amber heads-up as they approach the
// daily graded-sentence cap, switching to a red "you're done for today" once they hit it. Renders
// nothing for accounts with no cap (admins/exempt) or anyone still comfortably under the threshold,
// so it only appears when it has something to say. The cap resets on the UTC calendar day (see the
// server's usage bucket), which the at-cap copy spells out.
export default function DailyCapBanner() {
  const { t } = useTranslation()
  const { usage } = useDailyUsage()
  if (!usage || !usage.capped) return null

  const { usedToday, cap } = usage
  const atCap = usedToday >= cap
  const nearCap = usedToday >= Math.ceil(cap * NEAR_CAP_RATIO)
  if (!atCap && !nearCap) return null

  const remaining = Math.max(0, cap - usedToday)
  const title = atCap ? t('dailyCap.atCapTitle') : t('dailyCap.nearCapTitle')
  const detail = atCap
    ? t('dailyCap.atCapDetail', { cap })
    : t('dailyCap.remaining', { count: remaining, cap })

  return (
    <Alert severity={atCap ? 'error' : 'warning'} sx={{ mb: 2 }}>
      <AlertTitle>{title}</AlertTitle>
      {detail}
    </Alert>
  )
}
