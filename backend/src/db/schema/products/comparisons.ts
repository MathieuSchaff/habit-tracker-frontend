import { sql } from 'drizzle-orm'
import { index, integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'

import { fkTenantPolicies, tenantPolicies } from '../_policies'
import { timestamps } from '../_timestamps'
import { users } from '../auth/users'
import { products } from './products'

export const productComparisons = pgTable(
  'product_comparisons',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name'),
    ...timestamps,
  },
  (t) => [
    index('product_comparisons_user_idx').on(t.userId),
    ...tenantPolicies('product_comparisons', t.userId),
  ]
).enableRLS()

export const productComparisonItems = pgTable(
  'product_comparison_items',
  {
    comparisonId: uuid('comparison_id')
      .notNull()
      .references(() => productComparisons.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.comparisonId, t.productId] }),
    index('product_comparison_items_comparison_idx').on(t.comparisonId),
    ...fkTenantPolicies(
      'product_comparison_items',
      sql`EXISTS (
        SELECT 1 FROM ${productComparisons} c
        WHERE c.id = ${t.comparisonId}
          AND c.user_id = (SELECT auth.uid())
      )`
    ),
  ]
).enableRLS()

export type ProductComparison = typeof productComparisons.$inferSelect
export type ProductComparisonItem = typeof productComparisonItems.$inferSelect
