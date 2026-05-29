import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_LOCALE, type SpanishLocale } from '../../shared/types'

const STORAGE_KEY = 'gac:locale'

function read(): SpanishLocale {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'es-MX' || v === 'es-ES' || v === 'es-AR') return v
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE
}

export function useLocale() {
  const [locale, setLocaleState] = useState<SpanishLocale>(read())

  const setLocale = useCallback((next: SpanishLocale) => {
    localStorage.setItem(STORAGE_KEY, next)
    setLocaleState(next)
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLocaleState(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { locale, setLocale }
}
