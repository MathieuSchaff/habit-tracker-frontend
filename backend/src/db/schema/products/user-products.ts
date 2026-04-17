import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgRole,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from '../auth/users'
import { products } from './products'

export const userProductStatusEnum = pgEnum('user_product_status', [
  'in_stock',
  'wishlist',
  'watched',
  'holy_grail',
  'archived',
  'avoided',
])

export const repurchaseFlagEnum = pgEnum('repurchase_flag', ['yes', 'no', 'unsure'])

export const userProducts = pgTable(
  'user_products',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    status: userProductStatusEnum('status').notNull().default('in_stock'),
    sentiment: integer('sentiment'), // 1-5
    wouldRepurchase: repurchaseFlagEnum('would_repurchase'),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('user_products_user_product_unique').on(t.userId, t.productId),
    index('user_products_user_idx').on(t.userId),
    index('user_products_status_idx').on(t.status),
    pgPolicy('user_products_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`${t.userId} = (SELECT current_setting('app.user_id', true)::uuid)`,
      withCheck: sql`${t.userId} = (SELECT current_setting('app.user_id', true)::uuid)`,
    }),
    pgPolicy('user_products_admin_bypass', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
      withCheck: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
    }),
  ]
).enableRLS()

export const userProductReviews = pgTable(
  'user_product_reviews',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userProductId: uuid('user_product_id')
      .notNull()
      .references(() => userProducts.id, { onDelete: 'cascade' })
      .unique(),
    tolerance: integer('tolerance'), // 1-5
    efficacy: integer('efficacy'), // 1-5
    sensoriality: integer('sensoriality'), // 1-5
    stability: integer('stability'), // 1-5
    mixability: integer('mixability'), // 1-5
    valueForMoney: integer('value_for_money'), // 1-5
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('user_product_reviews_user_product_idx').on(t.userProductId),
    // Explicit user_id check keeps policy correct for owner role (bypasses RLS until FORCE RLS in T7).
    pgPolicy('user_product_reviews_tenant_isolation', {
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
    pgPolicy('user_product_reviews_admin_bypass', {
      as: 'permissive',
      for: 'all',
      to: pgRole('app_runtime').existing(),
      using: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
      withCheck: sql`(SELECT current_setting('app.role', true)) = 'admin'`,
    }),
  ]
).enableRLS()

export type UserProduct = typeof userProducts.$inferSelect
export type UserProductInsert = typeof userProducts.$inferInsert
export type UserProductReview = typeof userProductReviews.$inferSelect
export type UserProductReviewInsert = typeof userProductReviews.$inferInsert
