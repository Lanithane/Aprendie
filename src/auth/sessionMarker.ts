// Mirrors the server session's absolute expiry (epoch ms) in localStorage so the SPA can
// tell a genuinely *expired* session apart from a never-logged-in visitor or a deliberate
// logout. The session cookie is httpOnly — the client can't read it — so we store the
// `sessionExpiresAt` the server reports on /api/me and consult it when a request 401s.
const KEY = 'aprendie:sessionExpiresAt'

// Record the expiry returned by /api/me. Called on every successful auth load, so an
// active user's marker always reflects the real (login-anchored) server expiry.
export function rememberSessionExpiry(expiresAt: number | null): void {
  if (expiresAt) localStorage.setItem(KEY, String(expiresAt))
}

// Drop the marker on deliberate logout so a later visit doesn't misread it as an expiry.
export function clearSessionMarker(): void {
  localStorage.removeItem(KEY)
}

// True only when a stored session has actually passed its expiry. Reading it consumes the
// marker so the "session expired" notice shows once, not on every later visit to /login.
// A 401 with a still-future marker (e.g. the cookie was cleared early) is not an expiry.
export function consumeExpiredSession(): boolean {
  const raw = localStorage.getItem(KEY)
  if (!raw) return false
  const expiresAt = Number(raw)
  const expired = Number.isFinite(expiresAt) && Date.now() >= expiresAt
  if (expired) localStorage.removeItem(KEY)
  return expired
}
