import { sql } from 'drizzle-orm'
import {
  date,
  index,
  integer,
  pgPolicy,
  pgRole,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

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
    // Explicit user_id check keeps policy correct for owner role (bypasses RLS until FORCE RLS in T7).
    pgPolicy('purchases_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`EXISTS (
        SELECT 1 FROM ${userProducts} p
        WHERE p.id = ${t.userProductId}
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )`,
      withCheck: sql`EXISTS (
        SELECT 1 FROM ${userProducts} p
        WHERE p.id = ${t.userProductId}
          AND p.user_id = (SELECT current_setting('app.user_id', true)::uuid)
      )`,
    }),
    pgPolicy('purchases_admin_bypass', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
      withCheck: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
    }),
  ]
).enableRLS()

export type Purchase = typeof purchases.$inferSelect
export type PurchaseInsert = typeof purchases.$inferInsert
