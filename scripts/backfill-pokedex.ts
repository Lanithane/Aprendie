// One-off backfill: seed the per-user word Pokédex (lexeme_stats + lexeme_variant_stats) from
// the existing `attempts` history. Re-runnable — it clears both tables first, then replays every
// attempt in (userId, createdAt asc) order through the same `recordSeenWords` use case the live
// path uses, so first/lastSeenAt windows come out identical to incremental recording.
//
// Run: npm run db:backfill:pokedex            (local, via .env)
//      DB_TARGET=prod npm run db:backfill:pokedex   (prod URL)
import { asc } from 'drizzle-orm'
import { db, pool } from '../server/infrastructure/db/client'
import { attempts } from '../server/infrastructure/db/schema'
import { recordSeenWords } from '../server/modules/pokedex/application/recordSeenWords'
import * as pokedexRepository from '../server/modules/pokedex/persistence/pokedexRepository'
import type { LanguageCode } from '../shared/languages'

async function main() {
  console.log('[backfill-pokedex] clearing existing Pokédex rows...')
  await pokedexRepository.clearAll()

  const rows = await db
    .select()
    .from(attempts)
    .orderBy(asc(attempts.userId), asc(attempts.createdAt), asc(attempts.id))

  console.log(`[backfill-pokedex] replaying ${rows.length} attempt(s)...`)
  let processed = 0
  for (const row of rows) {
    await recordSeenWords({
      userId: row.userId,
      learnLanguage: row.learnLanguage as LanguageCode,
      wordBreakdown: row.wordBreakdown ?? [],
      mistakes: row.mistakes ?? [],
      seenAt: row.createdAt,
    })
    processed += 1
    if (processed % 100 === 0) console.log(`[backfill-pokedex]   ...${processed}`)
  }

  console.log(`[backfill-pokedex] done — ${processed} attempt(s) folded into the Pokédex.`)
  await pool.end()
}

main().catch(async (err) => {
  console.error('[backfill-pokedex] failed:', err)
  await pool.end()
  process.exit(1)
})
