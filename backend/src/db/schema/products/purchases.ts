import { sql } from 'drizzle-orm'
import { check, date, index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

import { fkTenantPolicies } from '../_policies'
import { userProducts } from './user-products'

export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userProductId: uuid('user_product_id')
      .notNull()
      .references(() => userProducts.id, { onDelete: 'cascade' }),
    purchasedAt: date('purchased_at').notNull(),
    pricePaidCents: integer('price_paid_cents'),
    openedAt: date('opened_at'),
    finishedAt: date('finished_at'),
    expiresAt: date('expires_at'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('purchases_user_product_idx').on(t.userProductId),
    index('purchases_user_product_purchased_idx').on(t.userProductId, t.purchasedAt),
    check(
      'purchases_opened_after_purchased',
      sql`${t.openedAt} IS NULL OR ${t.openedAt} >= ${t.purchasedAt}`
    ),
    check(
      'purchases_finished_after_max',
      sql`${t.finishedAt} IS NULL OR ${t.finishedAt} >= COALESCE(${t.openedAt}, ${t.purchasedAt})`
    ),
    ...fkTenantPolicies(
      'purchases',
      sql`EXISTS (
        SELECT 1 FROM ${userProducts} p
        WHERE p.id = ${t.userProductId}
          AND p.user_id = (SELECT auth.uid())
      )`
    ),
  ]
).enableRLS()

export type Purchase = typeof purchases.$inferSelect
export type PurchaseInsert = typeof purchases.$inferInsert
