import { api } from './client'

export function saveApiKey(apiKey: string): Promise<void> {
  return api<void>('/api/key', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  })
}

export function removeApiKey(): Promise<void> {
  return api<void>('/api/key', { method: 'DELETE' })
}
