import { useEffect, useRef } from 'react'

// Reads a freshly loaded sentence aloud on its own, a configurable beat after it renders, when the
// learner has opted in (see useAutoSpeakPreference). The timer lives here — not in the component —
// per the repo's useEffect rules. It re-arms when the sentence (`text`) changes or when the voice
// list first becomes ready, so nudging the rate slider mid-sentence doesn't restart playback; a
// pending timer is cleared on the next sentence and on unmount. In-flight audio is cancelled by
// `speak()` itself (it cancels before each utterance) and by useSpeech's unmount cleanup.
//
// `ready` (voices loaded) exists because the Web Speech voice list loads asynchronously on mobile —
// `speechSynthesis.getVoices()` returns [] until `voiceschanged` fires (see useSpeech). On a cold
// mobile load the timer often fires before voices arrive; speaking with no resolvable voice gets
// silently dropped by mobile browsers, which is why auto-play "sometimes" didn't play. We still make
// a best-effort attempt when voices haven't loaded (some platforms speak with the browser default
// even when getVoices() stays empty), but only mark a sentence done once it was spoken with voices
// actually available — so when voices load late, the effect re-arms and the sentence is read aloud.
export function useAutoSpeak({
  text,
  locale,
  rate,
  enabled,
  delayMs,
  ready,
  speak,
}: {
  text: string
  locale: string
  rate: number
  enabled: boolean
  delayMs: number
  ready: boolean
  speak: (text: string, locale: string, rate?: number) => void
}) {
  // Keep the live speak/locale/rate/ready in a ref so a rate tweak or `speak` changing identity when
  // voices load doesn't itself re-arm the timer — only a new sentence or voices first becoming ready
  // should. The ref is updated in an effect (not during render) per react-hooks/refs.
  const latest = useRef({ speak, locale, rate, ready })
  useEffect(() => {
    latest.current = { speak, locale, rate, ready }
  })

  // The last sentence we read aloud with voices available; guards against re-speaking the same
  // sentence when `ready` flips or a later `voiceschanged` keeps it true.
  const spokenWithVoices = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !text.trim() || spokenWithVoices.current === text) return
    const id = window.setTimeout(() => {
      const { speak, locale, rate, ready } = latest.current
      // Best-effort: speak even if voices haven't loaded (covers platforms that read with the
      // browser default), but only "lock" the sentence once a real voice was available — otherwise
      // the silent-drop case stays unlocked so the `ready` flip re-arms and actually plays it.
      speak(text, locale, rate)
      if (ready) spokenWithVoices.current = text
    }, delayMs)
    return () => window.clearTimeout(id)
  }, [text, enabled, delayMs, ready])
}
