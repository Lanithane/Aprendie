export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    // Machine-readable error code from the server body (e.g. 'daily_cap', 'access_pending'),
    // when present. Lets callers branch on the failure without parsing the message.
    public code?: string
  ) {
    super(message)
  }
}

// Build an ApiError from a non-ok response. Our error responses are JSON `{ error, code? }`; surface
// the human message and code when we can, falling back to the raw body / status text otherwise.
// Exported so non-`api()` callers (e.g. the streaming grade fetch) shape errors the same way.
export async function readApiError(res: Response): Promise<ApiError> {
  const text = await res.text().catch(() => '')
  let message = text || res.statusText
  let code: string | undefined
  if (text) {
    try {
      const body = JSON.parse(text) as { error?: unknown; code?: unknown }
      if (typeof body.error === 'string') message = body.error
      if (typeof body.code === 'string') code = body.code
    } catch {
      // Non-JSON body — keep the raw text as the message.
    }
  }
  return new ApiError(res.status, message, code)
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw await readApiError(res)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
