import { sql } from 'drizzle-orm'
import {
  boolean,
  numeric,
  pgPolicy,
  pgRole,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from '../auth/users'
import { ingredients } from './ingredients'

export const userIngredientAnalysisScore = pgTable(
  'user_ingredient_analysis_score',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    suspicionScore: numeric('suspicion_score').default('0'),
    favoriteScore: numeric('favorite_score').default('0'),
    isSuspect: boolean('is_suspect').default(false),
    isFavorite: boolean('is_favorite').default(false),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('user_ing_intel_idx').on(t.userId, t.ingredientId),
    pgPolicy('user_ingredient_analysis_score_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`${t.userId} = (SELECT current_setting('app.user_id', true)::uuid)`,
      withCheck: sql`${t.userId} = (SELECT current_setting('app.user_id', true)::uuid)`,
    }),
    pgPolicy('user_ingredient_analysis_score_admin_bypass', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
      withCheck: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
    }),
  ]
).enableRLS()

export type UserIngredientAnalysisScore = typeof userIngredientAnalysisScore.$inferSelect
export type UserIngredientAnalysisScoreInsert = typeof userIngredientAnalysisScore.$inferInsert
