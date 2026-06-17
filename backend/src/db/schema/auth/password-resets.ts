import { sql } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { users } from './users'

// Mirrors email_verifications: pre-identity lookup table (forgot/reset happen
// before any session), so it stays outside RLS like its sibling. Only the sha256
// token hash is stored; the raw token lives only in the reset link.
export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('password_resets_token_hash_ux').on(t.tokenHash),
    index('password_resets_user_id_idx').on(t.userId),
    // At most one active (unused) reset per user: serialises concurrent forgot-password
    // requests at the DB so the loser's INSERT fails (caught best-effort upstream) instead
    // of leaving two live tokens. Enforces ADR 0010 "prior tokens invalidated each request".
    uniqueIndex('password_resets_active_per_user_ux').on(t.userId).where(sql`used_at IS NULL`),
  ]
)

export type PasswordReset = typeof passwordResets.$inferSelect
export type NewPasswordReset = typeof passwordResets.$inferInsert
