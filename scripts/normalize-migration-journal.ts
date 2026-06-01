/**
 * Enforce strictly-increasing `when` timestamps in drizzle's migration journal.
 *
 * Why this exists
 * ---------------
 * The drizzle migrator decides whether to apply a migration by comparing its journal `when`
 * (folderMillis) against the highest `created_at` already recorded in `__drizzle_migrations`:
 * it applies only when `when` is strictly greater. Several early migrations (≈0013–0017) were
 * hand-authored with round, FUTURE-dated timestamps (e.g. 1780900000000 ≈ 2026-06). Because
 * those values are ahead of the real clock, every NEW migration that `drizzle-kit generate`
 * stamps with the real wall-clock time lands BELOW the recorded ceiling — so the migrator
 * silently skips it (no error, nothing applied). And the ceiling is baked into every existing
 * database, so the problem self-propagates: each manual bump only raises the ceiling further.
 *
 * The fix
 * -------
 * Run this immediately after `drizzle-kit generate` (wired into `npm run db:generate`). It walks
 * the journal in order and, wherever an entry's `when` is not strictly greater than the previous
 * entry's, raises it to `prev + 1`. In practice that only ever touches the newest entry (the
 * historical ones are already monotonic), guaranteeing the freshly generated migration always
 * sorts above the ceiling and therefore actually applies. Once the real clock passes the inflated
 * baseline, generated timestamps exceed it naturally and this script becomes a no-op — it
 * self-heals. Idempotent and safe to run standalone.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const JOURNAL_PATH = path.resolve(__dirname, '..', 'drizzle', 'meta', '_journal.json')

interface JournalEntry {
  idx: number
  version: string
  when: number
  tag: string
  breakpoints: boolean
}

interface Journal {
  version: string
  dialect: string
  entries: JournalEntry[]
}

function main() {
  const raw = readFileSync(JOURNAL_PATH, 'utf8')
  const journal = JSON.parse(raw) as Journal

  // Defensive: process in journal order (by idx) regardless of array ordering.
  const entries = [...journal.entries].sort((a, b) => a.idx - b.idx)

  const bumped: Array<{ tag: string; from: number; to: number }> = []
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1]
    const cur = entries[i]
    if (cur.when <= prev.when) {
      const to = prev.when + 1
      bumped.push({ tag: cur.tag, from: cur.when, to })
      cur.when = to
    }
  }

  if (bumped.length === 0) {
    console.log('[journal] timestamps already strictly increasing — no change')
    return
  }

  journal.entries = entries
  // Match drizzle-kit's formatting exactly (2-space indent, no trailing newline) so the diff
  // stays minimal.
  writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2))
  for (const b of bumped) {
    console.log(`[journal] bumped ${b.tag} when ${b.from} -> ${b.to} (kept strictly increasing)`)
  }
}

main()
