import { useEffect, useRef } from 'react'

// Reads a freshly loaded sentence aloud on its own, a configurable beat after it renders, when the
// learner has opted in (see useAutoSpeakPreference). The timer lives here — not in the component —
// per the repo's useEffect rules. It re-arms only when the sentence (`text`) changes, so nudging
// the rate slider or a voice list loading mid-sentence doesn't restart playback; a pending timer is
// cleared on the next sentence and on unmount. In-flight audio is cancelled by `speak()` itself (it
// cancels before each utterance) and by useSpeech's unmount cleanup.
export function useAutoSpeak({
  text,
  locale,
  rate,
  enabled,
  delayMs,
  speak,
}: {
  text: string
  locale: string
  rate: number
  enabled: boolean
  delayMs: number
  speak: (text: string, locale: string, rate?: number) => void
}) {
  // Keep the live speak/locale/rate in a ref so they aren't effect dependencies — only a new
  // sentence should re-arm the timer, not a rate tweak or `speak` changing identity when voices
  // load asynchronously. The ref is updated in an effect (not during render) per react-hooks/refs.
  const latest = useRef({ speak, locale, rate })
  useEffect(() => {
    latest.current = { speak, locale, rate }
  })

  useEffect(() => {
    if (!enabled || !text.trim()) return
    const id = window.setTimeout(() => {
      latest.current.speak(text, latest.current.locale, latest.current.rate)
    }, delayMs)
    return () => window.clearTimeout(id)
  }, [text, enabled, delayMs])
}
