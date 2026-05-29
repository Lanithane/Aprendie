import { useCallback, useState } from 'react'
import { ApiError } from '../api/client'
import { saveApiKey, removeApiKey } from '../api/apiKeyApi'
import { useAuth } from '../auth/AuthContext'

interface UseApiKeyResult {
  saving: boolean
  removing: boolean
  error: string | null
  save: (apiKey: string) => Promise<boolean>
  remove: () => Promise<boolean>
  clearError: () => void
}

export function useApiKey(): UseApiKeyResult {
  const { refresh } = useAuth()
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handle = useCallback(
    async (fn: () => Promise<unknown>, fallback: string) => {
      setError(null)
      try {
        await fn()
        await refresh()
        return true
      } catch (err) {
        setError(err instanceof ApiError ? err.message : fallback)
        return false
      }
    },
    [refresh]
  )

  const save = useCallback(
    async (apiKey: string) => {
      setSaving(true)
      try {
        return await handle(() => saveApiKey(apiKey), 'Failed to save API key')
      } finally {
        setSaving(false)
      }
    },
    [handle]
  )

  const remove = useCallback(async () => {
    setRemoving(true)
    try {
      return await handle(() => removeApiKey(), 'Failed to remove key')
    } finally {
      setRemoving(false)
    }
  }, [handle])

  return { saving, removing, error, save, remove, clearError: () => setError(null) }
}
