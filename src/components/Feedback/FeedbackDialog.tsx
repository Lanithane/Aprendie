import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Alert,
  Snackbar,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { submitFeedback, FEEDBACK_CATEGORIES, type FeedbackCategory } from '../../api/feedbackApi'
import { ApiError } from '../../api/client'

const CATEGORY_KEYS: Record<
  FeedbackCategory,
  'feedback.catIdea' | 'feedback.catBug' | 'feedback.catPraise' | 'feedback.catOther'
> = {
  idea: 'feedback.catIdea',
  bug: 'feedback.catBug',
  praise: 'feedback.catPraise',
  other: 'feedback.catOther',
}

const MAX_LENGTH = 4000

interface FeedbackDialogProps {
  open: boolean
  onClose: () => void
}

export default function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const { t } = useTranslation()
  const loc = useLocation()
  const [category, setCategory] = useState<FeedbackCategory>('idea')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function reset() {
    setCategory('idea')
    setMessage('')
    setError(null)
    setSubmitting(false)
  }

  function handleClose() {
    if (submitting) return
    reset()
    onClose()
  }

  async function handleSubmit() {
    const trimmed = message.trim()
    if (!trimmed) {
      setError(t('feedback.emptyError'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitFeedback({ category, message: trimmed, page: loc.pathname })
      reset()
      onClose()
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('feedback.sendError'))
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
        <DialogTitle>{t('feedback.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography color='text.secondary' variant='body2'>
              {t('feedback.subtitle')}
            </Typography>
            <ToggleButtonGroup
              value={category}
              exclusive
              size='small'
              onChange={(_, v: FeedbackCategory | null) => v && setCategory(v)}
              aria-label={t('feedback.categoryAria')}
            >
              {FEEDBACK_CATEGORIES.map((c) => (
                <ToggleButton key={c} value={c}>
                  {t(CATEGORY_KEYS[c])}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <TextField
              label={t('feedback.messageLabel')}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
              multiline
              minRows={4}
              fullWidth
              autoFocus
              helperText={`${message.length}/${MAX_LENGTH}`}
            />
            {error && <Alert severity='error'>{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button color='secondary' onClick={handleClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button
            variant='contained'
            onClick={() => void handleSubmit()}
            disabled={submitting || message.trim().length === 0}
          >
            {submitting ? t('feedback.sending') : t('feedback.send')}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={sent}
        autoHideDuration={4000}
        onClose={() => setSent(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity='success' onClose={() => setSent(false)} variant='filled'>
          {t('feedback.thanks')}
        </Alert>
      </Snackbar>
    </>
  )
}
