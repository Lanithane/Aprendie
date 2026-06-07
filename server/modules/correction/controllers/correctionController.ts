import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import {
  correctTranslation,
  correctTranslationStreaming,
  SentenceNotFoundError,
} from '../application/correctTranslation'

const router = Router()

const bodySchema = z.object({
  sentenceId: z.string().uuid(),
  userAnswer: z.string().min(1),
})

// Blocking grade — returns the full CorrectionView as one JSON body. Kept as the client's fallback
// for when the streaming endpoint can't be used (a proxy that buffers SSE, a mid-stream drop).
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    try {
      const view = await correctTranslation({
        user: req.user as UserRow,
        sentenceId: parsed.data.sentenceId,
        userAnswer: parsed.data.userAnswer,
      })
      res.json(view)
    } catch (err) {
      if (err instanceof SentenceNotFoundError) {
        return res.status(404).json({ error: err.message })
      }
      throw err
    }
  })
)

// Streaming grade — forwards the model's output over Server-Sent Events so the client can reveal the
// corrected answer and mistakes as they generate (the win grows with output length, i.e. with level).
// Events: `delta` (raw model text), then a single `done` (authoritative CorrectionView), or `error`.
// `Cache-Control: no-transform` opts this response out of the global compression middleware so each
// frame flushes immediately; `X-Accel-Buffering: no` does the same for an upstream proxy.
router.post(
  '/stream',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }

    // Abort the model call if the learner navigates away mid-grade (no wasted tokens, no persist).
    const abort = new AbortController()
    req.on('close', () => abort.abort())

    // Switch to SSE lazily on the first delta so gate/lookup failures (which throw before any delta)
    // can still be answered as a conventional HTTP error with the right status.
    let streaming = false
    const beginStream = () => {
      if (streaming) return
      streaming = true
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')
      res.flushHeaders()
    }
    const send = (event: Record<string, unknown>) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`)
    }

    try {
      const view = await correctTranslationStreaming(
        {
          user: req.user as UserRow,
          sentenceId: parsed.data.sentenceId,
          userAnswer: parsed.data.userAnswer,
        },
        (delta) => {
          beginStream()
          send({ type: 'delta', text: delta })
        },
        abort.signal
      )
      beginStream()
      send({ type: 'done', view })
      res.end()
    } catch (err) {
      // Learner navigated away — the connection is gone, nothing to report.
      if (abort.signal.aborted) {
        if (!res.writableEnded) res.end()
        return
      }
      // Already streaming → report the failure in-band and close the SSE stream.
      if (streaming) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'grading failed' })
        res.end()
        return
      }
      // Failed before the first delta (gate/lookup) → conventional HTTP error. SentenceNotFound maps
      // to 404 here; domain spend/cap errors propagate to the error handler with their status + code.
      if (err instanceof SentenceNotFoundError) {
        return res.status(404).json({ error: err.message })
      }
      throw err
    }
  })
)

export default router
