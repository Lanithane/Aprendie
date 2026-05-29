import { pgTable, uuid, text, timestamp, varchar, json, index } from 'drizzle-orm/pg-core'
import type { WordToken } from '../../../shared/languages'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  googleSub: text('google_sub').notNull().unique(),
  encryptedAnthropicKey: text('encrypted_anthropic_key'),
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
    grammarFocus: text('grammar_focus'),
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
