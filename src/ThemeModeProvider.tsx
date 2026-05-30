import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { createGacTheme, DEFAULT_THEME_ID, THEME_IDS, type ThemeId } from './theme'
import { useAuth } from './auth/AuthContext'
import { updateUserAppearance } from './api/userApi'
import type { ThemeMode } from '../shared/appearance'

export type { ThemeMode }

const STORAGE_KEY = 'gac:themeMode'
const THEME_STORAGE_KEY = 'gac:themeId'

interface ThemeModeState {
  mode: ThemeMode
  resolvedMode: 'light' | 'dark'
  setMode: (m: ThemeMode) => void
  cycleMode: () => void
  themeId: ThemeId
  setThemeId: (id: ThemeId) => void
}

const ThemeModeContext = createContext<ThemeModeState | null>(null)

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    // ignore
  }
  return 'system'
}

function readStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (v && (THEME_IDS as string[]).includes(v)) return v as ThemeId
  } catch {
    // ignore
  }
  return DEFAULT_THEME_ID
}

function osDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const CYCLE: ThemeMode[] = ['light', 'dark', 'system']

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [mode, setModeState] = useState<ThemeMode>(readStored)
  const [themeId, setThemeIdState] = useState<ThemeId>(readStoredTheme)
  const [systemDark, setSystemDark] = useState(osDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Adopt the account's saved appearance once the signed-in user loads (cross-device sync). Local
  // state seeds from localStorage first to avoid a flash; the server value wins when present.
  useEffect(() => {
    if (!user) return
    if (user.themeId && (THEME_IDS as string[]).includes(user.themeId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeIdState(user.themeId as ThemeId)
      try {
        localStorage.setItem(THEME_STORAGE_KEY, user.themeId)
      } catch {
        // ignore
      }
    }
    if (user.themeMode) {
      setModeState(user.themeMode)
      try {
        localStorage.setItem(STORAGE_KEY, user.themeMode)
      } catch {
        // ignore
      }
    }
  }, [user])

  const resolvedMode: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  const setMode = (next: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
    setModeState(next)
    if (user) void updateUserAppearance({ themeMode: next }).catch(() => {})
  }

  const cycleMode = () => {
    const idx = CYCLE.indexOf(mode)
    setMode(CYCLE[(idx + 1) % CYCLE.length])
  }

  const setThemeId = (next: ThemeId) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // ignore
    }
    setThemeIdState(next)
    if (user) void updateUserAppearance({ themeId: next }).catch(() => {})
  }

  const theme = useMemo(() => createGacTheme(themeId, resolvedMode), [themeId, resolvedMode])

  return (
    <ThemeModeContext.Provider
      value={{ mode, resolvedMode, setMode, cycleMode, themeId, setThemeId }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) throw new Error('useThemeMode must be inside ThemeModeProvider')
  return ctx
}
