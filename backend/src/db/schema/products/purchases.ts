import { sql } from 'drizzle-orm'
import { date, index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

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
  ]
)

export type Purchase = typeof purchases.$inferSelect
export type PurchaseInsert = typeof purchases.$inferInsert
