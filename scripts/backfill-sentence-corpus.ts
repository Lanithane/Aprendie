// One-off backfill (Epic 20): migrate the legacy per-user `sentence_cache` pool into the shared,
// deduplicated `sentences` corpus + the per-user `sentence_exposures` ledger.
//
// For each old pool row we:
//   1. upsert-dedupe it into the corpus by its content key (pair, locale, level, contentHash),
//   2. if it was consumed, record one exposure (userId → the corpus row) dated to consumedAt.
//
// Idempotent: corpus inserts use ON CONFLICT DO NOTHING and exposures key on (userId, sentenceId),
// so a second run is a no-op. Legacy rows carry no token attribution or theme, so those land as
// 0 / null. Once prod is backfilled, `sentence_cache` can be dropped in a follow-up migration.
//
// Run: npm run db:backfill:corpus                       (local, via .env)
//      DB_TARGET=prod npm run db:backfill:corpus         (prod URL)
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db, pool } from '../server/infrastructure/db/client'
import {
  sentenceCache,
  sentences,
  sentenceExposures,
  type SentenceCacheRow,
} from '../server/infrastructure/db/schema'
import { contentHash } from '../server/modules/sentence/domain/contentHash'

async function findCorpusId(row: SentenceCacheRow, hash: string): Promise<string | null> {
  const levelCond = row.level == null ? isNull(sentences.level) : eq(sentences.level, row.level)
  const found = await db
    .select({ id: sentences.id })
    .from(sentences)
    .where(
      and(
        eq(sentences.learnLanguage, row.learnLanguage),
        eq(sentences.guessLanguage, row.guessLanguage),
        eq(sentences.locale, row.locale),
        levelCond,
        eq(sentences.contentHash, hash)
      )
    )
    .limit(1)
  return found[0]?.id ?? null
}

async function main() {
  const rows = await db
    .select()
    .from(sentenceCache)
    .orderBy(asc(sentenceCache.createdAt), asc(sentenceCache.id))

  console.log(`[backfill-corpus] migrating ${rows.length} legacy pool row(s)...`)
  let corpusInserted = 0
  let exposures = 0
  let processed = 0

  for (const row of rows) {
    const hash = contentHash(row.promptText)

    const inserted = await db
      .insert(sentences)
      .values({
        learnLanguage: row.learnLanguage,
        guessLanguage: row.guessLanguage,
        locale: row.locale,
        level: row.level,
        promptText: row.promptText,
        answerText: row.answerText,
        wordBreakdown: row.wordBreakdown,
        theme: null,
        contentHash: hash,
        createdAt: row.createdAt,
      })
      .onConflictDoNothing({
        target: [
          sentences.learnLanguage,
          sentences.guessLanguage,
          sentences.locale,
          sentences.level,
          sentences.contentHash,
        ],
      })
      .returning({ id: sentences.id })
    if (inserted.length > 0) corpusInserted += 1

    const corpusId = inserted[0]?.id ?? (await findCorpusId(row, hash))
    if (!corpusId) {
      console.warn(`[backfill-corpus]   could not resolve corpus row for cache id ${row.id}`)
      continue
    }

    // Only consumed rows became "seen" by the user; un-consumed buffer rows just feed the corpus.
    if (row.consumedAt) {
      const seenAt = row.consumedAt
      const res = await db
        .insert(sentenceExposures)
        .values({
          userId: row.userId,
          sentenceId: corpusId,
          seenCount: 1,
          firstSeenAt: seenAt,
          lastSeenAt: seenAt,
        })
        .onConflictDoNothing({ target: [sentenceExposures.userId, sentenceExposures.sentenceId] })
        .returning({ id: sentenceExposures.id })
      if (res.length > 0) exposures += 1
    }

    processed += 1
    if (processed % 100 === 0) console.log(`[backfill-corpus]   ...${processed}`)
  }

  console.log(
    `[backfill-corpus] done — ${corpusInserted} new corpus row(s), ${exposures} new exposure(s) from ${processed} legacy row(s).`
  )
  await pool.end()
}

main().catch(async (err) => {
  console.error('[backfill-corpus] failed:', err)
  await pool.end()
  process.exit(1)
})
