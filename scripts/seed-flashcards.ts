// Bulk flash-card seeding: pre-generate every deck for every (learn-locale × guess-language) slice
// via the half-price Message Batches API and insert into the shared `flashcards` corpus. Mirrors
// seed-sentence-corpus.ts: same submit-then-collect pattern, same resumable state file, same
// idempotent upsert on the content key so re-running is a no-op.
//
// SAFETY: this SPENDS real money on the operator key. It never submits unless you pass `--submit`.
//
//   # See the plan + cost, spend nothing:
//   DB_TARGET=prod npm run db:seed:flashcards -- --estimate
//
//   # Submit batches (writes a resumable state file), then poll + collect:
//   DB_TARGET=prod npm run db:seed:flashcards -- --submit
//
//   # Resume collection later (batches can take up to 24h):
//   DB_TARGET=prod npm run db:seed:flashcards -- --collect-only
//
// Scope flags: --learn es,fr   --guess en   --decks conjunctions,months
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../server/infrastructure/db/client'
import {
  SUPPORTED_LANGUAGE_CODES,
  localesFor,
  type LanguageCode,
  type LocaleCode,
} from '../shared/languages'
import { DECKS, isDeckId, type DeckDef } from '../shared/decks'
import {
  getOperatorAnthropicClient,
  SENTENCE_MODEL,
} from '../server/infrastructure/claude/anthropicClient'
import {
  buildFlashcardMessageParams,
  parseFlashcardResponse,
} from '../server/modules/flashcard/application/generateFlashcardBatch'
import { insertCards } from '../server/modules/flashcard/persistence/flashcardRepository'
import {
  createMessageBatch,
  fetchBatchResults,
  isBatchEnded,
  type BatchRequest,
} from '../server/infrastructure/claude/batchClient'
import { costUsd, toTokenUsage, type TokenUsage } from '../server/infrastructure/claude/pricing'
import { createHash } from 'crypto'

const STATE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '.seed-flashcards-state.json'
)

const EST_INPUT_TOKENS = 200
const EST_OUTPUT_TOKENS = 800
const EST_CACHE_READ_TOKENS = 900

interface Slice {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  deck: DeckDef
}

interface Filters {
  learn?: LanguageCode[]
  guess?: LanguageCode[]
  decks?: string[]
}

function encodeCustomId(slice: Slice): string {
  const key = `${slice.learnLanguage}|${slice.guessLanguage}|${slice.locale}|${slice.deck.id}`
  return Buffer.from(key).toString('base64url')
}

function decodeCustomId(customId: string): { learnLanguage: LanguageCode; guessLanguage: LanguageCode; locale: LocaleCode; deckId: string } {
  const [learnLanguage, guessLanguage, locale, deckId] = Buffer.from(customId, 'base64url')
    .toString('utf8')
    .split('|')
  return { learnLanguage: learnLanguage as LanguageCode, guessLanguage: guessLanguage as LanguageCode, locale: locale as LocaleCode, deckId }
}

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
        for (const deck of DECKS) {
          if (filters.decks && !filters.decks.includes(deck.id)) continue
          slices.push({ learnLanguage, guessLanguage, locale, deck })
        }
      }
    }
  }
  return slices
}

function buildAllRequests(slices: Slice[]): BatchRequest[] {
  return slices.map((slice) => ({
    customId: encodeCustomId(slice),
    params: buildFlashcardMessageParams({
      learnLanguage: slice.learnLanguage,
      guessLanguage: slice.guessLanguage,
      locale: slice.locale,
      deck: slice.deck,
    }),
  }))
}

function estimateCostUsd(slices: Slice[]): number {
  let dollars = 0
  const usage: TokenUsage = {
    inputTokens: EST_INPUT_TOKENS,
    outputTokens: EST_OUTPUT_TOKENS,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: EST_CACHE_READ_TOKENS,
  }
  dollars += slices.length * costUsd(SENTENCE_MODEL, usage, true)
  return dollars
}

interface SeedState {
  batchIds: string[]
  collected: boolean[]
}

function loadState(): SeedState | null {
  if (!existsSync(STATE_PATH)) return null
  return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as SeedState
}

function saveState(state: SeedState): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

function normalise(s: string): string {
  return s.normalize('NFC').toLowerCase().trim()
}

function contentHash(lemma: string): string {
  return createHash('sha1').update(normalise(lemma)).digest('hex')
}

// ------ CLI arg parsing -------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2)
  const flags = {
    estimate: args.includes('--estimate'),
    submit: args.includes('--submit'),
    collectOnly: args.includes('--collect-only'),
  }
  const filters: Filters = {}
  const learnArg = args.find((a) => a.startsWith('--learn='))?.split('=')[1]
  if (learnArg) filters.learn = learnArg.split(',') as LanguageCode[]
  const guessArg = args.find((a) => a.startsWith('--guess='))?.split('=')[1]
  if (guessArg) filters.guess = guessArg.split(',') as LanguageCode[]
  const decksArg = args.find((a) => a.startsWith('--decks='))?.split('=')[1]
  if (decksArg) {
    const ids = decksArg.split(',')
    const invalid = ids.filter((id) => !isDeckId(id))
    if (invalid.length) { console.error(`Unknown deck ids: ${invalid.join(', ')}`); process.exit(1) }
    filters.decks = ids
  }
  return { flags, filters }
}

// ------ submit ----------------------------------------------------------------

async function submit(requests: BatchRequest[]): Promise<SeedState> {
  const anthropic = getOperatorAnthropicClient()
  const BATCH_LIMIT = 1000
  const chunks: BatchRequest[][] = []
  for (let i = 0; i < requests.length; i += BATCH_LIMIT) {
    chunks.push(requests.slice(i, i + BATCH_LIMIT))
  }

  console.log(`Submitting ${chunks.length} batch(es) — ${requests.length} request(s) total…`)
  const batchIds: string[] = []
  for (const chunk of chunks) {
    const batchId = await createMessageBatch(anthropic, chunk)
    batchIds.push(batchId)
    console.log(`  ✓ submitted batch ${batchId} (${chunk.length} requests)`)
  }
  const state: SeedState = { batchIds, collected: batchIds.map(() => false) }
  saveState(state)
  console.log(`State written to ${STATE_PATH}`)
  return state
}

// ------ collect ---------------------------------------------------------------

async function collect(state: SeedState, requests: BatchRequest[]): Promise<void> {
  const anthropic = getOperatorAnthropicClient()
  const requestByCustomId = new Map(requests.map((r) => [r.customId, r]))

  let totalCost = 0
  let totalCards = 0

  for (let i = 0; i < state.batchIds.length; i++) {
    if (state.collected[i]) {
      console.log(`Batch ${state.batchIds[i]} already collected, skipping.`)
      continue
    }
    const batchId = state.batchIds[i]
    process.stdout.write(`Polling batch ${batchId}…`)

    // Poll until ended (simple wait loop; for very long waits use --collect-only later).
    let ended = await isBatchEnded(anthropic, batchId)
    while (!ended) {
      process.stdout.write('.')
      await new Promise((r) => setTimeout(r, 30_000))
      ended = await isBatchEnded(anthropic, batchId)
    }
    console.log(' done.')

    const results = await fetchBatchResults(anthropic, batchId)
    for (const result of results) {
      if (result.result.type !== 'succeeded') {
        console.warn(`  ⚠ request ${result.custom_id} failed: ${result.result.type}`)
        continue
      }
      const req = requestByCustomId.get(result.custom_id)
      if (!req) continue
      const { learnLanguage, guessLanguage, locale, deckId } = decodeCustomId(result.custom_id)
      const deck = DECKS.find((d) => d.id === deckId)
      if (!deck) continue

      const msg = result.result.message
      const usage = toTokenUsage(msg.usage)
      totalCost += costUsd(SENTENCE_MODEL, usage, true)

      let cards
      try {
        cards = parseFlashcardResponse(msg, `seed/${deckId}`)
      } catch (err) {
        console.warn(`  ⚠ parse failed for ${result.custom_id}: ${err}`)
        continue
      }

      await insertCards(
        cards.map((c, idx) => ({
          learnLanguage,
          guessLanguage,
          locale,
          deckId,
          lemma: c.lemma,
          gloss: c.gloss,
          partOfSpeech: c.partOfSpeech,
          gender: c.gender ?? null,
          example: c.example || null,
          exampleTranslation: c.exampleTranslation || null,
          contentHash: contentHash(c.lemma),
          genInputTokens: idx === 0 ? usage.inputTokens : 0,
          genOutputTokens: Math.round(usage.outputTokens / cards.length),
          genCachedInputTokens: Math.round(usage.cacheReadInputTokens / cards.length),
        }))
      )
      totalCards += cards.length
      console.log(`  ✓ ${deckId} ${learnLanguage}→${guessLanguage} (${locale}): ${cards.length} cards`)
    }

    state.collected[i] = true
    saveState(state)
  }

  console.log(`\nDone. ${totalCards} cards inserted. Actual cost: $${totalCost.toFixed(4)}`)
}

// ------ main ------------------------------------------------------------------

async function main() {
  const { flags, filters } = parseArgs()
  const slices = enumerateSlices(filters)

  if (slices.length === 0) {
    console.log('No slices match the given filters.')
    process.exit(0)
  }

  if (flags.estimate) {
    const cost = estimateCostUsd(slices)
    console.log(`${slices.length} slices (${DECKS.length} decks × learn-locale × guess)`)
    console.log(`Estimated cost (batch rate, 50% off): $${cost.toFixed(4)}`)
    process.exit(0)
  }

  if (flags.collectOnly) {
    const state = loadState()
    if (!state) {
      console.error('No state file found. Run with --submit first.')
      process.exit(1)
    }
    const requests = buildAllRequests(slices)
    await collect(state, requests)
    await pool.end()
    return
  }

  if (!flags.submit) {
    console.error('Pass --estimate to preview cost, --submit to generate, or --collect-only to resume.')
    process.exit(1)
  }

  if (existsSync(STATE_PATH)) {
    console.error(`State file already exists at ${STATE_PATH}. Use --collect-only to resume, or delete the file to start fresh.`)
    process.exit(1)
  }

  const requests = buildAllRequests(slices)
  const state = await submit(requests)
  await collect(state, requests)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
