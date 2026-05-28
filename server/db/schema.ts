import { pgTable, uuid, text, timestamp, integer, varchar, json, index } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  googleSub: text('google_sub').notNull().unique(),
  // Encoded as `iv$ciphertext$authtag`, each base64. Null until user provides a key.
  encryptedAnthropicKey: text('encrypted_anthropic_key'),
  localePreference: text('locale_preference').notNull().default('es-MX'),
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
    locale: text('locale').notNull(),
    spanish: text('spanish').notNull(),
    expectedEnglish: text('expected_english').notNull(),
    difficulty: integer('difficulty'),
    grammarFocus: text('grammar_focus'),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_sentence_cache_user_locale').on(table.userId, table.locale),
    index('idx_sentence_cache_consumed').on(table.consumedAt),
  ]
)

// Session table — owned by connect-pg-simple's expected schema.
// Defined here so Drizzle migrations create it alongside everything else.
export const session = pgTable(
  'session',
  {
    sid: varchar('sid').primaryKey(),
    sess: json('sess').notNull(),
    expire: timestamp('expire', { precision: 6, withTimezone: false }).notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type SentenceRow = typeof sentenceCache.$inferSelect
export type NewSentenceRow = typeof sentenceCache.$inferInsert
