// Bulk corpus seeding: pre-generate sentences for every (learn-locale × guess-language × level)
// slice and fold them into the shared `sentences` corpus, so a brand-new slice serves instantly
// instead of cold-starting on the first learner. Runs entirely on the half-price Message Batches
// API and reuses the LIVE generation/collection building blocks (`buildSentenceMessageParams`,
// `parseSentenceResponse`, `toCorpusRows`, `insertCorpus`) so seeded rows are byte-identical to
// organically generated ones — same prompt, same dedupe key, same amortized token cost.
//
// SAFETY: this SPENDS real money on the operator key. It never submits unless you pass `--submit`,
// and it refuses to resubmit on top of an existing state file (use `--collect-only` to resume).
//
//   # See the plan + cost, spend nothing:
//   DB_TARGET=prod npm run db:seed:corpus -- --estimate
//
//   # Submit batches (writes a resumable state file), then poll + collect into the corpus:
//   DB_TARGET=prod npm run db:seed:corpus -- --submit
//
//   # Resume collection later (batches can take up to 24h):
//   DB_TARGET=prod npm run db:seed:corpus -- --collect-only
//
// Resumability: every submitted Message Batch id is written to a state file BEFORE we wait on it,
// so a crash (or Ctrl-C) never loses a paid-for, in-flight batch — re-run with `--collect-only`.
// Idempotent on the DB side: `insertCorpus` upserts on the content key, so duplicates (inevitable
// at low levels with a tiny sentence space) are silently dropped; re-collecting is a no-op.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { db, pool } from '../server/infrastructure/db/client'
import { sentences } from '../server/infrastructure/db/schema'
import {
  SUPPORTED_LANGUAGE_CODES,
  localesFor,
  type LanguageCode,
  type LocaleCode,
} from '../shared/languages'
import { LEVEL_CODES, type LevelCode } from '../shared/levels'
import {
  getOperatorAnthropicClient,
  SENTENCE_MODEL,
} from '../server/infrastructure/claude/anthropicClient'
import {
  BATCH_SIZE,
  buildSentenceMessageParams,
  parseSentenceResponse,
} from '../server/modules/sentence/application/generateSentenceBatch'
import { toCorpusRows } from '../server/modules/sentence/application/sentencePool'
import { insertCorpus } from '../server/modules/sentence/persistence/sentenceRepository'
import {
  createMessageBatch,
  fetchBatchResults,
  isBatchEnded,
  type BatchRequest,
} from '../server/infrastructure/claude/batchClient'
import { costUsd, toTokenUsage, type TokenUsage } from '../server/infrastructure/claude/pricing'

const STATE_PATH = join(dirname(fileURLToPath(import.meta.url)), '.seed-sentence-corpus-state.json')

// Default volume per slice (the operator chose a flat 100). `--per-slice <n>` overrides it; `--ramp`
// instead scales by level so we don't burn spend on low-level dedupe collisions (a tiny "starter"
// sentence space saturates fast). Kept here so the estimate and the submit use one source of truth.
const DEFAULT_PER_SLICE = 100
const RAMP: Record<LevelCode, number> = {
  starter: 100,
  a1: 150,
  a2: 250,
  b1: 400,
  b2: 500,
  c1: 500,
  c2: 500,
}

// Reasoned per-REQUEST (=BATCH_SIZE sentences) output-token estimates per level, for the cost
// projection only — higher levels yield longer sentences with denser word-breakdowns. Actuals are
// summed from real usage and reported at the end; these only shape the upfront `--estimate`.
const EST_OUTPUT_TOKENS_PER_REQUEST: Record<LevelCode, number> = {
  starter: 1200,
  a1: 1800,
  a2: 2400,
  b1: 3000,
  b2: 3600,
  c1: 4200,
  c2: 4500,
}
// The cached system block (~1k tokens) reads cheap on every request after the first; the user
// message is ~150 fresh tokens. Cache-creation is a one-off per batch (<$0.01 total), so we ignore
// it in the estimate.
const EST_INPUT_TOKENS_PER_REQUEST = 150
const EST_CACHE_READ_TOKENS_PER_REQUEST = 1000

// ---- one corpus slice to seed -------------------------------------------------------------------

interface Slice {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level: LevelCode
}

// custom_id charset is [A-Za-z0-9_-] (base64url fits); the slice round-trips through it so collected
// results route back to the right slice/level without a side mapping. `idx` makes each request id
// unique within (and across) batches.
function encodeCustomId(slice: Slice, idx: number): string {
  const key = `${slice.learnLanguage}|${slice.guessLanguage}|${slice.locale}|${slice.level}|${idx}`
  return Buffer.from(key).toString('base64url')
}

function decodeCustomId(customId: string): Slice {
  const [learnLanguage, guessLanguage, locale, level] = Buffer.from(customId, 'base64url')
    .toString('utf8')
    .split('|')
  return {
    learnLanguage: learnLanguage as LanguageCode,
    guessLanguage: guessLanguage as LanguageCode,
    locale,
    level: level as LevelCode,
  }
}

// Every (learn-locale × guess-language × level) slice, filtered by the CLI scope flags. A language
// with no regional split would seed under its bare code, but every supported language has ≥1 locale.
function enumerateSlices(filters: Filters): Slice[] {
  const slices: Slice[] = []
  for (const learnLanguage of SUPPORTED_LANGUAGE_CODES) {
    if (filters.learn && !filters.learn.includes(learnLanguage)) continue
    const locales = localesFor(learnLanguage)
    const localeCodes = locales.length > 0 ? locales.map((l) => l.code) : [learnLanguage]
    for (const locale of localeCodes) {
      for (const guessLanguage of SUPPORTED_LANGUAGE_CODES) {
        if (guessLanguage === learnLanguage) continue
        if (filters.guess && !filters.guess.includes(guessLanguage)) continue
        for (const level of LEVEL_CODES) {
          if (filters.levels && !filters.levels.includes(level)) continue
          slices.push({ learnLanguage, guessLanguage, locale, level })
        }
      }
    }
  }
  return slices
}

// Split a slice's target count into BATCH_SIZE-capped request counts (a trailing remainder request
// when `perSlice` isn't a multiple of BATCH_SIZE). max_tokens is sized for ~BATCH_SIZE, so we never
// ask one request for more than that.
function requestCountsForSlice(perSlice: number): number[] {
  const counts: number[] = []
  let remaining = perSlice
  while (remaining > 0) {
    const take = Math.min(BATCH_SIZE, remaining)
    counts.push(take)
    remaining -= take
  }
  return counts
}

function perSliceFor(level: LevelCode, opts: PlanOpts): number {
  return opts.ramp ? RAMP[level] : opts.perSlice
}

// Build every batch request across every slice, reusing the LIVE request builder so seeded rows
// match organically generated ones exactly (same cached system block, same shape, same dedupe key).
function buildAllRequests(slices: Slice[], opts: PlanOpts): BatchRequest[] {
  const requests: BatchRequest[] = []
  for (const slice of slices) {
    const counts = requestCountsForSlice(perSliceFor(slice.level, opts))
    counts.forEach((count, idx) => {
      requests.push({
        customId: encodeCustomId(slice, idx),
        params: buildSentenceMessageParams(
          {
            learnLanguage: slice.learnLanguage,
            guessLanguage: slice.guessLanguage,
            locale: slice.locale,
            level: slice.level,
          },
          count
        ),
      })
    })
  }
  return requests
}

// Project batch-rate cost from the per-level token assumptions above — level-aware so the estimate
// reflects that C2 requests cost ~4× a starter one. Returns dollars; `true` applies the 50% batch
// discount, matching how these requests actually bill.
function estimateCostUsd(slices: Slice[], opts: PlanOpts): number {
  let dollars = 0
  for (const slice of slices) {
    const counts = requestCountsForSlice(perSliceFor(slice.level, opts))
    for (const count of counts) {
      // Scale the per-request output estimate to a short trailing request proportionally.
      const output = Math.round((EST_OUTPUT_TOKENS_PER_REQUEST[slice.level] * count) / BATCH_SIZE)
      const usage: TokenUsage = {
        inputTokens: EST_INPUT_TOKENS_PER_REQUEST,
        outputTokens: output,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: EST_CACHE_READ_TOKENS_PER_REQUEST,
      }
      dollars += costUsd(SENTENCE_MODEL, usage, true)
    }
  }
  return dollars
}

// ---- resumable state ----------------------------------------------------------------------------

interface BatchState {
  batchId: string
  requestCount: number
  collected: boolean
}

interface SeedState {
  createdAt: string
  perSliceLabel: string
  batches: BatchState[]
}

function loadState(): SeedState | null {
  if (!existsSync(STATE_PATH)) return null
  return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as SeedState
}

function saveState(state: SeedState): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

// ---- CLI ----------------------------------------------------------------------------------------

interface Filters {
  learn?: LanguageCode[]
  guess?: LanguageCode[]
  levels?: LevelCode[]
}

interface PlanOpts {
  perSlice: number
  ramp: boolean
}

interface Args extends Filters, PlanOpts {
  action: 'estimate' | 'submit' | 'collect-only'
  batchRequests: number
  pollIntervalMs: number
  force: boolean
}

function parseList<T extends string>(raw: string | undefined): T[] | undefined {
  if (!raw) return undefined
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as T[]
}

function flagValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}

function parseArgs(argv: string[]): Args {
  const has = (name: string) => argv.includes(name)
  const action = has('--submit') ? 'submit' : has('--collect-only') ? 'collect-only' : 'estimate'
  return {
    action,
    perSlice: Number(flagValue(argv, '--per-slice') ?? DEFAULT_PER_SLICE),
    ramp: has('--ramp'),
    batchRequests: Number(flagValue(argv, '--batch-requests') ?? 1000),
    pollIntervalMs: Number(flagValue(argv, '--poll-interval') ?? 30) * 1000,
    force: has('--force'),
    learn: parseList<LanguageCode>(flagValue(argv, '--learn')),
    guess: parseList<LanguageCode>(flagValue(argv, '--guess')),
    levels: parseList<LevelCode>(flagValue(argv, '--levels')),
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function corpusCount(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(sentences)
  return row?.count ?? 0
}

// ---- submit + collect ---------------------------------------------------------------------------

async function submit(requests: BatchRequest[], opts: Args): Promise<SeedState> {
  const anthropic = getOperatorAnthropicClient()
  const groups = chunk(requests, opts.batchRequests)
  const state: SeedState = {
    createdAt: new Date().toISOString(),
    perSliceLabel: opts.ramp ? 'ramp' : String(opts.perSlice),
    batches: [],
  }
  console.log(`[seed] submitting ${requests.length} request(s) in ${groups.length} batch(es)...`)
  for (let i = 0; i < groups.length; i++) {
    const batchId = await createMessageBatch(anthropic, groups[i])
    // Persist the id BEFORE moving on, so a crash never strands a paid-for batch.
    state.batches.push({ batchId, requestCount: groups[i].length, collected: false })
    saveState(state)
    console.log(`[seed]   batch ${i + 1}/${groups.length} → ${batchId} (${groups[i].length} req)`)
  }
  return state
}

// Poll every un-collected batch to completion, then parse + upsert its results into the corpus.
// Mirrors the live collector (parse per result, amortize that result's own usage across its
// sentences, tag with the batch id) but routes each result to its slice via the custom_id.
async function collect(state: SeedState, opts: Args): Promise<void> {
  const anthropic = getOperatorAnthropicClient()
  const before = await corpusCount()
  let totalUsage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  }
  let collectedSentences = 0
  let failedResults = 0

  for (const batch of state.batches) {
    if (batch.collected) {
      console.log(`[seed] batch ${batch.batchId} already collected, skipping`)
      continue
    }

    const startedAt = Date.now()
    while (!(await isBatchEnded(anthropic, batch.batchId))) {
      const mins = Math.round((Date.now() - startedAt) / 60_000)
      console.log(`[seed] batch ${batch.batchId} still processing (${mins}m elapsed)...`)
      await sleep(opts.pollIntervalMs)
    }

    const results = await fetchBatchResults(anthropic, batch.batchId)
    for (const r of results) {
      if (!r.message) {
        failedResults += 1
        continue
      }
      const slice = decodeCustomId(r.customId)
      try {
        const sentences = parseSentenceResponse(r.message, 'seed/collect', slice.level)
        const usage = toTokenUsage(r.message.usage)
        await insertCorpus(toCorpusRows(slice, sentences, usage, batch.batchId))
        collectedSentences += sentences.length
        totalUsage = {
          inputTokens: totalUsage.inputTokens + usage.inputTokens,
          outputTokens: totalUsage.outputTokens + usage.outputTokens,
          cacheCreationInputTokens:
            totalUsage.cacheCreationInputTokens + usage.cacheCreationInputTokens,
          cacheReadInputTokens: totalUsage.cacheReadInputTokens + usage.cacheReadInputTokens,
        }
      } catch (err) {
        // One unparseable result shouldn't sink the rest of the batch.
        failedResults += 1
        console.error(`[seed]   unparseable result ${r.customId}:`, err)
      }
    }

    batch.collected = true
    saveState(state)
    console.log(`[seed] batch ${batch.batchId} collected (${results.length} results)`)
  }

  const after = await corpusCount()
  const actualCost = costUsd(SENTENCE_MODEL, totalUsage, true)
  console.log('\n[seed] ---- done ----')
  console.log(`[seed] sentences parsed:     ${collectedSentences}`)
  console.log(`[seed] failed/empty results: ${failedResults}`)
  console.log(`[seed] net-new corpus rows:  ${after - before} (duplicates upsert-skipped)`)
  console.log(`[seed] actual batch cost:    $${actualCost.toFixed(2)}`)
}

// ---- main ---------------------------------------------------------------------------------------

function printPlan(slices: Slice[], requests: BatchRequest[], opts: Args): void {
  const totalSentences = slices.reduce((n, s) => n + perSliceFor(s.level, opts), 0)
  const est = estimateCostUsd(slices, opts)
  console.log('[seed] plan:')
  console.log(`[seed]   slices:          ${slices.length}`)
  console.log(`[seed]   per slice:       ${opts.ramp ? 'ramp (per level)' : opts.perSlice}`)
  console.log(`[seed]   target sentences:${totalSentences.toLocaleString()}`)
  console.log(`[seed]   batch requests:  ${requests.length} (${BATCH_SIZE} sentences each)`)
  console.log(
    `[seed]   message batches: ${Math.ceil(requests.length / opts.batchRequests)} (≤${opts.batchRequests} req each)`
  )
  console.log(
    `[seed]   estimated cost:  ~$${est.toFixed(2)} (batch rate; actuals reported on collect)`
  )
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  // Collect-only resumes from the state file — no enumeration/estimate needed.
  if (args.action === 'collect-only') {
    const state = loadState()
    if (!state) {
      console.error(`[seed] no state file at ${STATE_PATH} — nothing to collect.`)
      process.exit(1)
    }
    console.log(`[seed] resuming collection of ${state.batches.length} batch(es) from state file`)
    await collect(state, args)
    return
  }

  const slices = enumerateSlices(args)
  const requests = buildAllRequests(slices, args)
  printPlan(slices, requests, args)

  if (args.action === 'estimate') {
    console.log('\n[seed] dry run — pass --submit to spend and seed. Nothing submitted.')
    return
  }

  // --submit: refuse to stack a new run on top of an unfinished one (double-spend guard).
  const existing = loadState()
  if (existing && !args.force) {
    const pending = existing.batches.filter((b) => !b.collected).length
    console.error(
      `[seed] state file exists (${existing.batches.length} batch(es), ${pending} uncollected).`
    )
    console.error('[seed] resume with --collect-only, or delete the state file / pass --force.')
    process.exit(1)
  }

  const state = await submit(requests, args)
  console.log(
    '[seed] all batches submitted; polling for completion (Ctrl-C is safe — resume with --collect-only)\n'
  )
  await collect(state, args)
}

main()
  .then(async () => {
    await pool.end()
  })
  .catch(async (err) => {
    console.error('[seed] failed:', err)
    await pool.end()
    process.exit(1)
  })
