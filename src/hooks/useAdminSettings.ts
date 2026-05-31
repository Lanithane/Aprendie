import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import {
  fetchSettings,
  updateSettings,
  type AdminSettings,
  type AdminSettingsPatch,
} from '../api/adminSettingsApi'

interface UseAdminSettingsResult {
  settings: AdminSettings | null
  loading: boolean
  error: string | null
  update: (patch: AdminSettingsPatch) => Promise<boolean>
}

// Loads the operator/site settings once and exposes a patch updater that merges the
// server's response back into local state, so the Limits panel stays in sync.
export function useAdminSettings(): UseAdminSettingsResult {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetchSettings()
      .then((s) => active && setSettings(s))
      .catch(
        (err) =>
          active && setError(err instanceof ApiError ? err.message : 'Failed to load settings')
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const update = useCallback(async (patch: AdminSettingsPatch) => {
    setError(null)
    try {
      const updated = await updateSettings(patch)
      setSettings(updated)
      return true
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update settings')
      return false
    }
  }, [])

  return { settings, loading, error, update }
}
