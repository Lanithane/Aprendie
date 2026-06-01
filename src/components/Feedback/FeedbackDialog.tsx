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
import { submitFeedback, FEEDBACK_CATEGORIES, type FeedbackCategory } from '../../api/feedbackApi'
import { ApiError } from '../../api/client'

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  idea: 'Idea',
  bug: 'Bug',
  praise: 'Praise',
  other: 'Other',
}

const MAX_LENGTH = 4000

interface FeedbackDialogProps {
  open: boolean
  onClose: () => void
}

export default function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
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
      setError('Please write a short message first.')
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
      setError(err instanceof ApiError ? err.message : 'Could not send feedback. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
        <DialogTitle>Send feedback</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography color='text.secondary' variant='body2'>
              Ideas, bugs, or just a hello! It all helps shape Aprendie.
            </Typography>
            <ToggleButtonGroup
              value={category}
              exclusive
              size='small'
              onChange={(_, v: FeedbackCategory | null) => v && setCategory(v)}
              aria-label='Feedback category'
            >
              {FEEDBACK_CATEGORIES.map((c) => (
                <ToggleButton key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <TextField
              label='Your message'
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
            Cancel
          </Button>
          <Button
            variant='contained'
            onClick={() => void handleSubmit()}
            disabled={submitting || message.trim().length === 0}
          >
            {submitting ? 'Sending…' : 'Send'}
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
          Thanks for the feedback!
        </Alert>
      </Snackbar>
    </>
  )
}
