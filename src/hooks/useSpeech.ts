import { useCallback, useEffect, useRef, useState } from 'react'
import { useSpeechVoice } from './useSpeechVoice'
import { bestDefaultVoice } from '../audio/voiceDefaults'

// Wraps the Web Speech API (`speechSynthesis` + `SpeechSynthesisUtterance`) for reading a
// learn-language sentence aloud. Voices load asynchronously and fire `voiceschanged` — the
// external-subscription case the repo's useEffect rules allow a hook to own. Voice selection
// honours the user's saved preferred voice when it exists and matches the language; absent a valid
// choice it defers to the smart-defaults registry (src/audio/voiceDefaults.ts), which scores the
// language's voices by locale specificity then known quality, else lets the browser pick. `speak`
// accepts a per-call rate so the caller's slider takes effect live.

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

// True when a voice belongs to the locale's base language (es-MX → any es-* or bare es).
function matchesLanguage(voice: SpeechSynthesisVoice, base: string): boolean {
  return voice.lang.toLowerCase().split('-')[0] === base
}

// Picks the best available voice for a BCP-47 locale. The user's explicitly chosen voice wins,
// but only while it still exists and speaks the active language — so switching learn languages
// quietly falls back instead of reading, say, French in a Spanish voice. Absent a valid choice,
// the smart-defaults registry scores the language's voices (locale specificity, then known
// quality), returning undefined only when no voice speaks the language (browser default).
function pickVoice(
  voices: SpeechSynthesisVoice[],
  locale: string,
  preferredURI: string | null
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined
  const base = locale.toLowerCase().split('-')[0]
  if (preferredURI) {
    const chosen = voices.find((v) => v.voiceURI === preferredURI)
    if (chosen && matchesLanguage(chosen, base)) return chosen
  }
  return bestDefaultVoice(
    voices.filter((v) => matchesLanguage(v, base)),
    locale
  )
}

export function useSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState(false)
  const { voiceURI } = useSpeechVoice()
  // Hold a ref to the active utterance so its event handlers aren't garbage-collected mid-speech.
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (!supported) return
    const sync = () => setVoices(window.speechSynthesis.getVoices())
    sync()
    window.speechSynthesis.addEventListener('voiceschanged', sync)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', sync)
      window.speechSynthesis.cancel()
    }
  }, [])

  const cancel = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    (text: string, locale: string, rate = 1) => {
      if (!supported || !text.trim()) return
      // Cancel any in-flight utterance so rapid taps don't queue up.
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = locale
      utterance.rate = rate
      const voice = pickVoice(voices, locale, voiceURI)
      if (voice) utterance.voice = voice
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      utteranceRef.current = utterance
      setSpeaking(true)
      window.speechSynthesis.speak(utterance)
    },
    [voices, voiceURI]
  )

  return { speak, cancel, speaking, supported, voices }
}
