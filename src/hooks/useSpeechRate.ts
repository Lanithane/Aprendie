import { useCallback, useEffect, useState } from 'react'

// Persisted text-to-speech playback rate (a SpeechSynthesisUtterance.rate multiplier).
// Client-side preference, same localStorage pattern as useLanguagePair.
const STORAGE_KEY = 'aprendie:speechRate'
export const DEFAULT_RATE = 1.0
export const MIN_RATE = 0.5
export const MAX_RATE = 1.5

function clamp(rate: number): number {
  return Math.min(MAX_RATE, Math.max(MIN_RATE, rate))
}

function read(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const n = Number(raw)
      if (Number.isFinite(n)) return clamp(n)
    }
  } catch {
    // ignore
  }
  return DEFAULT_RATE
}

function write(rate: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(rate))
  } catch {
    // ignore
  }
}

export function useSpeechRate() {
  const [rate, setRateState] = useState<number>(read())

  const setRate = useCallback((next: number) => {
    const clamped = clamp(next)
    write(clamped)
    setRateState(clamped)
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRateState(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { rate, setRate }
}
