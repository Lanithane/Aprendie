import type { Showback } from '../../api/showbackApi'

// The two config-link CTA targets. Overridable via env (`VITE_OFFSET_URL` → a water-offset /
// restoration cause, `VITE_SUPPORT_URL` → the developer's GitHub Sponsors page); each falls back
// to a sensible default so the links always render.
const DEFAULT_OFFSET_URL = 'https://www.charitywater.org/donate'
const DEFAULT_SUPPORT_URL = 'https://github.com/sponsors/Lanithane'

function readUrl(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

export const OFFSET_URL = readUrl(import.meta.env.VITE_OFFSET_URL, DEFAULT_OFFSET_URL)
export const SUPPORT_URL = readUrl(import.meta.env.VITE_SUPPORT_URL, DEFAULT_SUPPORT_URL)

// Cost so far, in dollars. Tiny totals (the common case on a fresh account) keep more
// precision so the number isn't just "$0.00".
export function formatUsd(n: number): string {
  if (n <= 0) return '$0.00'
  if (n < 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(2)}`
}

// Water footprint estimate, mL below a litre then litres.
export function formatWater(ml: number): string {
  if (ml < 1000) return `${Math.round(ml)} mL`
  return `${(ml / 1000).toFixed(2)} L`
}

export function waterLabel(showback: Showback): string {
  return formatWater(showback.estimate.waterMl)
}
