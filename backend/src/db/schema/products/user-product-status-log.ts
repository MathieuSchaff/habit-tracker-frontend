import { sql } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { fkTenantPolicies } from '../_policies'
import { users } from '../auth/users'
import { userProductStatusEnum, userProducts } from './user-products'

// Append-only journal of user_products.status transitions. Captures the
// retrieval promise ("why did I reject this 3 months ago?") that a scalar
// status column cannot answer. Service-layer writes — see
// backend/src/features/user-products/service.ts.
export const userProductStatusLog = pgTable(
  'user_product_status_log',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userProductId: uuid('user_product_id')
      .notNull()
      .references(() => userProducts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fromStatus: userProductStatusEnum('from_status'),
    toStatus: userProductStatusEnum('to_status').notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('user_product_status_log_user_product_idx').on(t.userProductId, t.createdAt),
    ...fkTenantPolicies(
      'user_product_status_log',
      sql`EXISTS (
        SELECT 1 FROM ${userProducts} p
        WHERE p.id = ${t.userProductId}
          AND p.user_id = (SELECT auth.uid())
      )`
    ),
  ]
).enableRLS()

export type UserProductStatusLog = typeof userProductStatusLog.$inferSelect
export type UserProductStatusLogInsert = typeof userProductStatusLog.$inferInsert
