import { useSyncExternalStore } from 'react'

// Persisted preferred text-to-speech voice, stored as the voice's stable `voiceURI`.
// `null` means "let the browser/locale logic pick" (the default). The chosen voice is only
// honoured when it still exists and matches the active learn language (see useSpeech).
//
// This is a *shared* store rather than per-component `useState`: the voice picker (Settings)
// and the player (`useSpeech`, on the practice card) mount independent hook instances at the
// same time. A plain localStorage write + `storage` listener can't sync them, because the
// `storage` event never fires in the tab that made the write — so a selection in Settings
// would never reach the player. A module-level value + listener set, read via
// `useSyncExternalStore`, keeps every consumer in the tab in lockstep; the `storage` listener
// still handles cross-tab sync.
const STORAGE_KEY = 'gac:speechVoiceURI'

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

let current = read()
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      current = read()
      emit()
    }
  })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): string | null {
  return current
}

function setVoiceURI(next: string | null) {
  try {
    if (next) localStorage.setItem(STORAGE_KEY, next)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  current = next
  emit()
}

export function useSpeechVoice() {
  const voiceURI = useSyncExternalStore(subscribe, getSnapshot, () => null)
  return { voiceURI, setVoiceURI }
}
