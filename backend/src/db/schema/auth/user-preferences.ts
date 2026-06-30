import type { CriteriaWeights } from '@aurore/shared'

import { sql } from 'drizzle-orm'
import { boolean, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

import { tenantPolicies } from '../_policies'
import { users } from './users'

export const userPreferences = pgTable(
  'user_preferences',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    criteriaWeights: jsonb('criteria_weights')
      .$type<CriteriaWeights>()
      .notNull()
      .default(
        sql`'{"tolerance":1,"efficacy":1,"sensoriality":1,"stability":1,"mixability":1,"valueForMoney":1}'::jsonb`
      ),
    aiConsent: boolean('ai_consent').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date().toISOString()),
  },
  (t) => [...tenantPolicies('user_preferences', t.userId)]
).enableRLS()

export type UserPreferencesRow = typeof userPreferences.$inferSelect
export type UserPreferencesInsert = typeof userPreferences.$inferInsert
