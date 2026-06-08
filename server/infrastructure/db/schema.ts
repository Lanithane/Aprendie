import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  json,
  integer,
  numeric,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core'
import type { WordToken, WordGender } from '../../../shared/languages'
import type { LevelCode } from '../../../shared/levels'
import type { ThemeMode } from '../../../shared/appearance'
import type { GrammarPosSection } from '../../../shared/grammar'

// Denormalized snapshot of a graded attempt. Mirrors the correction `Mistake`
// shape structurally so the DB layer stays free of module imports.
export interface AttemptMistakeSnapshot {
  userPhrase: string
  correctPhrase: string
  sourceText: string
  explanation: string
}

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  googleSub: text('google_sub').notNull().unique(),
  // Loose-typed like `level` on sentence_cache to avoid pg-enum alter friction.
  role: text('role').$type<'admin' | 'user'>().notNull().default('user'),
  // Access gate: every account spends the operator key, so a new account starts
  // `pending` and cannot spend until the operator approves it; `blocked` revokes access.
  // Loose-typed text like `role`. Existing rows are backfilled to `approved` in the migration.
  access: text('access').$type<'pending' | 'approved' | 'blocked'>().notNull().default('pending'),
  level: text('level').$type<LevelCode | null>(),
  // Appearance prefs, persisted per account. Loose-typed text like `level`/`role` to avoid
  // pg-enum friction; `theme_id` is an opaque registry id (unknown -> client falls back).
  themeId: text('theme_id'),
  themeMode: text('theme_mode').$type<ThemeMode | null>(),
  // Language pair + locale, persisted per account. Loose-typed text like `level`/`role`;
  // nullable until the user picks during onboarding (the client falls back to DEFAULT_PAIR),
  // so the server can warm the chosen pool.
  learnLanguage: text('learn_language'),
  guessLanguage: text('guess_language'),
  locale: text('locale'),
  // Auto-speak prefs (Epic 15): whether a new sentence is read aloud on its own and the delay
  // before it plays. Nullable — a null column falls back to the shared/speech.ts defaults on read
  // (auto-speak on, 500 ms), so new accounts get the default without a DB default.
  autoSpeak: boolean('auto_speak'),
  autoSpeakDelayMs: integer('auto_speak_delay_ms'),
  // Per-user daily-cap controls (operator-key spend). `capExemptUntil`, when in the future,
  // skips the cap entirely (a temporary "uncap for a bit"); `dailyCapOverride`, when set,
  // replaces the global cap for this account. Both null by default → global cap applies.
  capExemptUntil: timestamp('cap_exempt_until', { withTimezone: true }),
  dailyCapOverride: integer('daily_cap_override'),
  // Streak (consecutive local days with a graded activity), persisted per account so it follows the
  // learner device-to-device. `streakEnabled` is the opt-out toggle — nullable, null/true =
  // participating, false = opted out (frozen, no streak writes). `timezone` is the IANA zone
  // captured from the browser, used to bucket grade instants into the learner's local day (null →
  // UTC). `streakLastDay` is that local 'YYYY-MM-DD'; current/longest are the running counts.
  streakEnabled: boolean('streak_enabled'),
  timezone: text('timezone'),
  streakCurrent: integer('streak_current').notNull().default(0),
  streakLongest: integer('streak_longest').notNull().default(0),
  streakLastDay: text('streak_last_day'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// LEGACY (pre-Epic 20): the per-user sentence pool. Superseded by the shared `sentences` corpus
// + per-user `sentence_exposures` ledger below — every pool was keyed by `user.id`, so ten users
// practicing the same `(pair, locale, level)` generated ten interchangeable batches. The table is
// retained only so `scripts/backfill-sentence-corpus.ts` can migrate its rows into the corpus;
// once prod has been backfilled it can be dropped in a follow-up migration.
export const sentenceCache = pgTable(
  'sentence_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    learnLanguage: text('learn_language').notNull(),
    guessLanguage: text('guess_language').notNull(),
    locale: text('locale').notNull(),
    promptText: text('prompt_text').notNull(),
    answerText: text('answer_text').notNull(),
    level: text('level'),
    wordBreakdown: json('word_breakdown').$type<WordToken[]>(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_sentence_cache_pool').on(
      table.userId,
      table.learnLanguage,
      table.guessLanguage,
      table.locale
    ),
    index('idx_sentence_cache_consumed').on(table.consumedAt),
  ]
)

// Epic 20 — the shared, de-duplicated sentence corpus. One row per distinct generated sentence
// keyed by `(learnLanguage, guessLanguage, locale, level, contentHash)`, reusable across every
// learner on that slice (one Spanish sentence serves many users) — this is where the generation
// cost collapses. `theme` records the everyday-domain category (powers Epic 21's same-category
// review). `contentHash` is a normalized hash of `promptText`; the unique index on
// `(pair, locale, level, contentHash)` is the cache key so a sentence is never stored twice.
// `gen*Tokens` carry the AMORTIZED token cost of generating this row (batch usage / sentenceCount
// at insert), so cost-per-sentence is attributed from day one on top of the per-batch usage_events.
export const sentences = pgTable(
  'sentences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnLanguage: text('learn_language').notNull(),
    guessLanguage: text('guess_language').notNull(),
    locale: text('locale').notNull(),
    level: text('level'),
    promptText: text('prompt_text').notNull(),
    answerText: text('answer_text').notNull(),
    wordBreakdown: json('word_breakdown').$type<WordToken[]>(),
    theme: text('theme'),
    contentHash: text('content_hash').notNull(),
    genInputTokens: integer('gen_input_tokens').notNull().default(0),
    genOutputTokens: integer('gen_output_tokens').notNull().default(0),
    genCachedInputTokens: integer('gen_cached_input_tokens').notNull().default(0),
    // Epic 22 — the Message Batch (`sentence_batch_jobs.batch_id`) that generated this row, when it
    // came from a half-price background fill. Null for synchronous cold-start rows. Soft reference
    // (no FK): the job is a transient tracking record that may be pruned while the corpus lives on.
    batchId: text('batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_sentences_content').on(
      table.learnLanguage,
      table.guessLanguage,
      table.locale,
      table.level,
      table.contentHash
    ),
    index('idx_sentences_slice').on(
      table.learnLanguage,
      table.guessLanguage,
      table.locale,
      table.level
    ),
  ]
)

// Epic 20 — per-user exposure ledger over the shared corpus. One row per (user, sentence) the user
// has been shown; `seenCount` bumps and `lastSeenAt` advances on every exposure (`firstSeenAt` is
// pinned on first sight). Drives the "prefer unseen, else least-recently-seen" picker (Epic 21
// makes it tunable). Mistake/score signal is read from `attempts` — no denormalization here.
// Cascades with both the user and the corpus sentence.
export const sentenceExposures = pgTable(
  'sentence_exposures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sentenceId: uuid('sentence_id')
      .notNull()
      .references(() => sentences.id, { onDelete: 'cascade' }),
    seenCount: integer('seen_count').notNull().default(0),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('uq_sentence_exposures').on(table.userId, table.sentenceId)]
)

// Epic 22 — durable tracking for in-flight Anthropic Message Batch fills (half-price background
// generation). One row per submitted batch; since a background refill warms a single `(pair,
// locale, level)` slice, each row carries that slice as discrete columns (cleaner indexed dedupe
// than scanning a json array). Replaces the old in-memory `refillsInFlight` Set — so a slice
// already in flight isn't resubmitted even across instances — and the collector polls it to drain
// ended batches into the corpus. `userId` records who triggered the fill, for showback attribution.
// Loose-typed text `status` (like `role`/`level`) to avoid pg-enum friction:
//   in_progress -> collecting (claimed by a poller) -> completed | failed.
export const sentenceBatchJobs = pgTable(
  'sentence_batch_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    batchId: text('batch_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    learnLanguage: text('learn_language').notNull(),
    guessLanguage: text('guess_language').notNull(),
    locale: text('locale').notNull(),
    level: text('level'),
    // How many sentences this batch was asked to generate (amortization denominator at collection).
    count: integer('count').notNull(),
    status: text('status')
      .$type<'in_progress' | 'collecting' | 'completed' | 'failed'>()
      .notNull()
      .default('in_progress'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The dedupe lookup: "is a fill already in flight for this exact slice?"
    index('idx_sentence_batch_jobs_slice').on(
      table.status,
      table.learnLanguage,
      table.guessLanguage,
      table.locale,
      table.level
    ),
    // The collector's claim scan walks open jobs oldest-first.
    index('idx_sentence_batch_jobs_status').on(table.status, table.createdAt),
  ]
)

// Per-user attempt history. Fully denormalized (a snapshot per attempt) so it
// survives `sentence_cache` pruning and serves as the single aggregation source
// for history/vocabulary features. `sentenceId` is a soft reference (no FK) for the
// same reason — the source sentence may be pruned while the attempt lives on.
export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sentenceId: uuid('sentence_id'),
    learnLanguage: text('learn_language').notNull(),
    guessLanguage: text('guess_language').notNull(),
    locale: text('locale').notNull(),
    level: text('level'),
    promptText: text('prompt_text').notNull(),
    answerText: text('answer_text').notNull(),
    userAnswer: text('user_answer').notNull(),
    correctedAnswer: text('corrected_answer').notNull(),
    score: integer('score').notNull(),
    grade: text('grade'),
    isCorrect: boolean('is_correct').notNull(),
    mistakes: json('mistakes').$type<AttemptMistakeSnapshot[]>().notNull(),
    notes: text('notes'),
    wordBreakdown: json('word_breakdown').$type<WordToken[]>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_attempts_user_created').on(table.userId, table.createdAt.desc()),
    index('idx_attempts_user_pair').on(
      table.userId,
      table.learnLanguage,
      table.guessLanguage,
      table.locale
    ),
  ]
)

// Per-user word "Palabradex" — aggregated lexeme (root) stats, derived from `attempts`
// (the Epic 5 history). One row per (user, learnLanguage, lemma). `seenCount` counts every
// appearance of the lemma across attempts; `correct`/`incorrect` split that total by whether
// the surface appeared in that attempt's correction mistakes. `partOfSpeech` is captured on
// first sight. Cascades with the user. See modules/palabradex/domain/seenWords.ts for the
// match heuristic.
export const lexemeStats = pgTable(
  'lexeme_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    learnLanguage: text('learn_language').notNull(),
    lemma: text('lemma').notNull(),
    partOfSpeech: text('part_of_speech').notNull(),
    seenCount: integer('seen_count').notNull().default(0),
    correctCount: integer('correct_count').notNull().default(0),
    incorrectCount: integer('incorrect_count').notNull().default(0),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_lexeme_stats').on(table.userId, table.learnLanguage, table.lemma),
    index('idx_lexeme_stats_user_lang').on(table.userId, table.learnLanguage),
  ]
)

// Per-user variant (inflected surface) stats, one grain below `lexeme_stats`. One row per
// (user, learnLanguage, lemma, surface) — drilling into a root reveals its surfaces with
// their own seen counts. Cascades with the user.
export const lexemeVariantStats = pgTable(
  'lexeme_variant_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    learnLanguage: text('learn_language').notNull(),
    lemma: text('lemma').notNull(),
    surface: text('surface').notNull(),
    seenCount: integer('seen_count').notNull().default(0),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_lexeme_variant_stats').on(
      table.userId,
      table.learnLanguage,
      table.lemma,
      table.surface
    ),
    index('idx_lexeme_variant_user_lang_lemma').on(table.userId, table.learnLanguage, table.lemma),
  ]
)

// Shared (cross-user) cache of AI-generated word definitions: the meaning of a learn-language
// root rendered in a known (guess) language. Keyed by (learnLanguage, guessLanguage, lemma) —
// a definition is identical for every learner with that pair, so it is generated once and
// reused, the same philosophy as the shared sentence corpus. Reference data: no user FK.
export const lexemeDefinitions = pgTable(
  'lexeme_definitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnLanguage: text('learn_language').notNull(),
    guessLanguage: text('guess_language').notNull(),
    lemma: text('lemma').notNull(),
    definition: text('definition').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_lexeme_definitions').on(table.learnLanguage, table.guessLanguage, table.lemma),
  ]
)

// Epic 19 — shared (cross-user) cache of the AI-generated grammar reference: the part-of-speech
// "how the language is built" overview that backs the Palabradex "Language" mode. Keyed by
// (learnLanguage, guessLanguage, locale) — member words + example sentences are in the learn
// language, the explanations/translations in the guess language, and dialect comes from the locale,
// so one row serves every learner on that triple (the same shared-reference philosophy as
// `lexeme_definitions` and the sentence corpus). Reference data: no user FK. `sections` is the
// `GrammarPosSection[]` payload; the row's columns carry the cache key.
export const grammarReferences = pgTable(
  'grammar_references',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnLanguage: text('learn_language').notNull(),
    guessLanguage: text('guess_language').notNull(),
    locale: text('locale').notNull(),
    sections: json('sections').$type<GrammarPosSection[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_grammar_references').on(table.learnLanguage, table.guessLanguage, table.locale),
  ]
)

// Flash-card corpus — the shared, de-duplicated word deck. One row per (learnLanguage,
// guessLanguage, locale, deckId, contentHash) so a card is generated once and served to every
// learner on that slice (same philosophy as the `sentences` corpus). `lemma` is the word's
// dictionary/base form in the learn language (the card front); `gloss` is the canonical
// one-to-three-word meaning in the guess language (the accepted answer); `example` + its
// translation are revealed on the back after grading. `contentHash` deduplicates on the
// normalised lemma so the same root word can't appear twice in one deck.
export const flashcards = pgTable(
  'flashcards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnLanguage: text('learn_language').notNull(),
    guessLanguage: text('guess_language').notNull(),
    locale: text('locale').notNull(),
    deckId: text('deck_id').notNull(),
    lemma: text('lemma').notNull(),
    gloss: text('gloss').notNull(),
    partOfSpeech: text('part_of_speech').notNull(),
    gender: text('gender').$type<WordGender | null>(),
    example: text('example'),
    exampleTranslation: text('example_translation'),
    contentHash: text('content_hash').notNull(),
    genInputTokens: integer('gen_input_tokens').notNull().default(0),
    genOutputTokens: integer('gen_output_tokens').notNull().default(0),
    genCachedInputTokens: integer('gen_cached_input_tokens').notNull().default(0),
    batchId: text('batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_flashcards_content').on(
      table.learnLanguage,
      table.guessLanguage,
      table.locale,
      table.deckId,
      table.contentHash
    ),
    index('idx_flashcards_deck').on(
      table.learnLanguage,
      table.guessLanguage,
      table.locale,
      table.deckId
    ),
  ]
)

// Per-user daily spend counter backing the operator-key cap. One row per (user, UTC day);
// `count` is the number of graded sentences (corrections) that day. `day` is a
// 'YYYY-MM-DD' UTC string so the boundary is timezone-stable and the row is a cheap
// upsert target. Rows cascade-delete with the user; old days are harmless to keep.
export const usageDaily = pgTable(
  'usage_daily',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })]
)

// Epic 6 — usage-cost showback. One row per billed Claude call (a correction grade or a
// sentence batch), keyed to the user it was spent for. Token counts and a dollar-cost SNAPSHOT
// (`cost_usd`, computed from the rate card at write time since list prices drift) let us total
// each account's spend and derive a labeled carbon/water estimate. Informational, not billing —
// all calls run on the operator key. Cascades with the user.
export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    operation: text('operation')
      .$type<
        | 'correction'
        | 'sentence_batch'
        | 'translation'
        | 'flashcard_grade'
        | 'flashcard_batch'
        | 'grammar'
      >()
      .notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cacheCreationInputTokens: integer('cache_creation_input_tokens').notNull().default(0),
    cacheReadInputTokens: integer('cache_read_input_tokens').notNull().default(0),
    costUsd: numeric('cost_usd', { precision: 12, scale: 6 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_usage_events_user_created').on(table.userId, table.createdAt)]
)

// Singleton operator/site settings (one row, fixed id = 1). Holds the global daily graded-sentence
// cap plus two site-wide kill switches: `signupsPaused` (reject brand-new account creation) and
// `spendPaused` (block all operator-key spend / maintenance). Read on every spend path, so it's a
// cheap single-row lookup. The row is seeded in the migration so `get()` always finds it.
export const appSettings = pgTable('app_settings', {
  id: integer('id').primaryKey().default(1),
  dailyGradedCap: integer('daily_graded_cap').notNull().default(100),
  signupsPaused: boolean('signups_paused').notNull().default(false),
  spendPaused: boolean('spend_paused').notNull().default(false),
  // When true, brand-new non-admin accounts are immediately approved instead of
  // landing in `pending`. Toggleable by an admin; off by default.
  autoApproveSignups: boolean('auto_approve_signups').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Epic 16 — self-hosted user feedback. One row per submission, denormalized with the page
// and user-agent context captured at send time so the admin inbox needs no joins beyond the
// user. `category` is loose-typed text (like `role`/`level`) to avoid pg-enum friction; the
// client constrains it. Cascades with the user.
export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: text('category').$type<'idea' | 'bug' | 'praise' | 'other'>().notNull(),
    message: text('message').notNull(),
    // Context captured at send time: the in-app path the user was on and their browser UA.
    page: text('page'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_feedback_created').on(table.createdAt.desc())]
)

// Epic 16 — self-hosted lightweight usage analytics. One row per event. `userId` is a nullable
// soft reference (no FK) so events can outlive the account and anonymous events are allowed; the
// account-scoped events we record today set it. `props` is free-form jsonb context per event name.
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    name: text('name').notNull(),
    props: json('props').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_events_name_created').on(table.name, table.createdAt.desc()),
    index('idx_events_created').on(table.createdAt.desc()),
  ]
)

export const session = pgTable(
  'session',
  {
    sid: varchar('sid').primaryKey(),
    sess: json('sess').notNull(),
    expire: timestamp('expire', { precision: 6, withTimezone: false }).notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)]
)

export type FlashcardRow = typeof flashcards.$inferSelect
export type NewFlashcardRow = typeof flashcards.$inferInsert
export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
// Legacy per-user pool row (kept only for the corpus backfill).
export type SentenceCacheRow = typeof sentenceCache.$inferSelect
// `SentenceRow`/`NewSentenceRow` now point at the shared corpus (`sentences`), so consumers
// (toSentenceView, correction, the repository) read/write the deduplicated corpus.
export type SentenceRow = typeof sentences.$inferSelect
export type NewSentenceRow = typeof sentences.$inferInsert
export type SentenceExposureRow = typeof sentenceExposures.$inferSelect
export type NewSentenceExposureRow = typeof sentenceExposures.$inferInsert
export type SentenceBatchJobRow = typeof sentenceBatchJobs.$inferSelect
export type NewSentenceBatchJobRow = typeof sentenceBatchJobs.$inferInsert
export type AttemptRow = typeof attempts.$inferSelect
export type NewAttemptRow = typeof attempts.$inferInsert
export type LexemeStatsRow = typeof lexemeStats.$inferSelect
export type NewLexemeStatsRow = typeof lexemeStats.$inferInsert
export type LexemeVariantStatsRow = typeof lexemeVariantStats.$inferSelect
export type NewLexemeVariantStatsRow = typeof lexemeVariantStats.$inferInsert
export type LexemeDefinitionRow = typeof lexemeDefinitions.$inferSelect
export type NewLexemeDefinitionRow = typeof lexemeDefinitions.$inferInsert
export type GrammarReferenceRow = typeof grammarReferences.$inferSelect
export type NewGrammarReferenceRow = typeof grammarReferences.$inferInsert
export type UsageDailyRow = typeof usageDaily.$inferSelect
export type UsageEventRow = typeof usageEvents.$inferSelect
export type NewUsageEventRow = typeof usageEvents.$inferInsert
export type AppSettingsRow = typeof appSettings.$inferSelect
export type NewAppSettingsRow = typeof appSettings.$inferInsert
export type FeedbackRow = typeof feedback.$inferSelect
export type NewFeedbackRow = typeof feedback.$inferInsert
export type EventRow = typeof events.$inferSelect
export type NewEventRow = typeof events.$inferInsert
