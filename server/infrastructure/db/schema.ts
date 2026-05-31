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
  encryptedAnthropicKey: text('encrypted_anthropic_key'),
  // Loose-typed like `level` on sentence_cache to avoid pg-enum alter friction.
  role: text('role').$type<'admin' | 'user'>().notNull().default('user'),
  // Access gate (Epic 12). Under the operator-key model every account spends the one
  // operator key, so a new account starts `pending` and cannot spend until the operator
  // approves it; `blocked` revokes access. Loose-typed text like `role`. Existing rows
  // (which predate the gate) are backfilled to `approved` in the migration.
  access: text('access').$type<'pending' | 'approved' | 'blocked'>().notNull().default('pending'),
  level: text('level').$type<LevelCode | null>(),
  // Appearance prefs, persisted per account. Loose-typed text like `level`/`role` to avoid
  // pg-enum friction; `theme_id` is an opaque registry id (unknown -> client falls back).
  themeId: text('theme_id'),
  themeMode: text('theme_mode').$type<ThemeMode | null>(),
  // Language pair + locale, persisted per account (Epic 11). Loose-typed text like
  // `level`/`role`; nullable until the user picks during onboarding (the client falls
  // back to DEFAULT_PAIR), and so the server can prewarm the chosen pool.
  learnLanguage: text('learn_language'),
  guessLanguage: text('guess_language'),
  locale: text('locale'),
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
// for the Epic 8 Pokédex. `sentenceId` is a soft reference (no FK) for the same
// reason — the source sentence may be pruned while the attempt lives on.
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

// Per-user daily spend counter backing the operator-key cap (Epic 12). One row per
// (user, UTC day); `count` is the number of graded sentences (corrections) that day.
// `day` is a 'YYYY-MM-DD' UTC string so the boundary is timezone-stable and the row is
// a cheap upsert target. Rows cascade-delete with the user; old days are harmless to keep.
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
export type UsageDailyRow = typeof usageDaily.$inferSelect
