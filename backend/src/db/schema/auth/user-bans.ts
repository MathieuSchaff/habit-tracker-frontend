import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { users } from './users'

export const banScopeEnum = pgEnum('ban_scope', [
  'ingredient_edit',
  'product_edit',
  'product_create',
  'global',
])

export const userBans = pgTable(
  'user_bans',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    scope: banScopeEnum('scope').notNull(),
    reason: text('reason'), // motif du ban
    bannedBy: uuid('banned_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // admin qui a banni
    expiresAt: timestamp('expires_at', { withTimezone: true }), // null = permanent
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('user_bans_user_idx').on(t.userId),
    index('user_bans_user_scope_idx').on(t.userId, t.scope),
  ]
)

export type UserBan = typeof userBans.$inferSelect
