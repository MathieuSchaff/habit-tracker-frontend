import { sql } from 'drizzle-orm'
import { index, pgEnum, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { tenantPolicies } from '../_policies'
import { appRuntimeRole } from '../_roles'
import { users } from './users'

export const banScopeEnum = pgEnum('ban_scope', [
  'ingredient_edit',
  'product_edit',
  'product_create',
  'global',
  'discussion_post',
  'review_publish',
  'ingredient_create',
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
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }), // null = permanent
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('user_bans_user_idx').on(t.userId),
    index('user_bans_user_scope_idx').on(t.userId, t.scope),
    ...tenantPolicies('user_bans', t.userId),
    // ADR-0006 S4: the contributor (« modérateur ») wields the reversible, content-scoped
    // bans — SELECT/INSERT/UPDATE/DELETE on any non-global ban. 'global' (account lockout)
    // stays admin-only via admin_bypass above. The route layer returns a clean 403 before
    // this fires; this is the DB backstop. Coarse FOR ALL is safe — bannedBy is audit-only
    // and the only writer is the admin bans service.
    pgPolicy('user_bans_moderation_scoped', {
      as: 'permissive',
      for: 'all',
      to: appRuntimeRole,
      using: sql`(SELECT auth.role()) = 'contributor' AND scope <> 'global'`,
      withCheck: sql`(SELECT auth.role()) = 'contributor' AND scope <> 'global'`,
    }),
  ]
).enableRLS()

export type UserBan = typeof userBans.$inferSelect
