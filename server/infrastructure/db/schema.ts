import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  json,
  integer,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core'
import type { WordToken } from '../../../shared/languages'
import type { LevelCode } from '../../../shared/levels'
import type { ThemeMode } from '../../../shared/appearance'

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
  // so the server can prewarm the chosen pool.
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

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

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
export type SentenceRow = typeof sentenceCache.$inferSelect
export type NewSentenceRow = typeof sentenceCache.$inferInsert
export type AttemptRow = typeof attempts.$inferSelect
export type NewAttemptRow = typeof attempts.$inferInsert
export type LexemeStatsRow = typeof lexemeStats.$inferSelect
export type NewLexemeStatsRow = typeof lexemeStats.$inferInsert
export type LexemeVariantStatsRow = typeof lexemeVariantStats.$inferSelect
export type NewLexemeVariantStatsRow = typeof lexemeVariantStats.$inferInsert
export type UsageDailyRow = typeof usageDaily.$inferSelect
export type AppSettingsRow = typeof appSettings.$inferSelect
export type NewAppSettingsRow = typeof appSettings.$inferInsert
export type FeedbackRow = typeof feedback.$inferSelect
export type NewFeedbackRow = typeof feedback.$inferInsert
export type EventRow = typeof events.$inferSelect
export type NewEventRow = typeof events.$inferInsert
