import type { CriteriaWeights } from '@habit-tracker/shared'

import { sql } from 'drizzle-orm'
import { boolean, jsonb, pgEnum, pgPolicy, pgRole, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

import { users } from './users'

export const displayScaleEnum = pgEnum('display_scale', [
  'out_of_5',
  'out_of_10',
  'out_of_20',
  'percentage',
])

export const userPreferences = pgTable(
  'user_preferences',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayScale: displayScaleEnum('display_scale').notNull().default('out_of_20'),
    criteriaWeights: jsonb('criteria_weights')
      .$type<CriteriaWeights>()
      .notNull()
      .default(
        sql`'{"tolerance":1,"efficacy":1,"sensoriality":1,"stability":1,"mixability":1,"valueForMoney":1}'::jsonb`
      ),
    aiConsent: boolean('ai_consent').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    pgPolicy('user_preferences_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`${t.userId} = (SELECT current_setting('app.user_id', true)::uuid)`,
      withCheck: sql`${t.userId} = (SELECT current_setting('app.user_id', true)::uuid)`,
    }),
    pgPolicy('user_preferences_admin_bypass', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
      withCheck: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
    }),
  ]
).enableRLS()

export type UserPreferencesRow = typeof userPreferences.$inferSelect
export type UserPreferencesInsert = typeof userPreferences.$inferInsert
