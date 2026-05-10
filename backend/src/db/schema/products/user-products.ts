import { repurchaseFlag, userProductStatus } from '@habit-tracker/shared'

import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { fkTenantPolicies, tenantPolicies } from '../_policies'
import { timestamps } from '../_timestamps'
import { users } from '../auth/users'
import { products } from './products'

export const userProductStatusEnum = pgEnum('user_product_status', [...userProductStatus])

export const repurchaseFlagEnum = pgEnum('repurchase_flag', [...repurchaseFlag])

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
    ...timestamps,
  },
  (t) => [
    uniqueIndex('user_products_user_product_unique').on(t.userId, t.productId),
    index('user_products_status_idx').on(t.status),
    check('user_products_sentiment_range', sql`${t.sentiment} BETWEEN 1 AND 5`),
    ...tenantPolicies('user_products', t.userId),
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
    ...timestamps,
  },
  (t) => [
    index('user_product_reviews_user_product_idx').on(t.userProductId),
    check('upr_tolerance_range', sql`${t.tolerance} BETWEEN 1 AND 5`),
    check('upr_efficacy_range', sql`${t.efficacy} BETWEEN 1 AND 5`),
    check('upr_sensoriality_range', sql`${t.sensoriality} BETWEEN 1 AND 5`),
    check('upr_stability_range', sql`${t.stability} BETWEEN 1 AND 5`),
    check('upr_mixability_range', sql`${t.mixability} BETWEEN 1 AND 5`),
    check('upr_value_for_money_range', sql`${t.valueForMoney} BETWEEN 1 AND 5`),
    ...fkTenantPolicies(
      'user_product_reviews',
      sql`EXISTS (
        SELECT 1 FROM ${userProducts} p
        WHERE p.id = ${t.userProductId}
          AND p.user_id = (SELECT auth.uid())
      )`
    ),
  ]
).enableRLS()

export type UserProduct = typeof userProducts.$inferSelect
export type UserProductInsert = typeof userProducts.$inferInsert
export type UserProductReview = typeof userProductReviews.$inferSelect
export type UserProductReviewInsert = typeof userProductReviews.$inferInsert
