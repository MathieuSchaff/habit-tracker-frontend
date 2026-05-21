import {
  type PreferencesTag,
  type RessentiTag,
  type RoutineTag,
  repurchaseFlag,
  userProductStatus,
} from '@habit-tracker/shared'

import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { moderationColumns } from '../_moderation'
import { fkTenantPolicies, tenantPolicies } from '../_policies'
import { appRuntimeRole } from '../_roles'
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
    sentiment: integer('sentiment'), // 1-6 (6 = Holy Grail)
    wouldRepurchase: repurchaseFlagEnum('would_repurchase'),
    comment: text('comment'),
    // F10 — user-experience tag catalogs (slug values validated in shared/).
    ressenti: text('ressenti').array().$type<RessentiTag[]>().notNull().default(sql`'{}'`),
    routine: text('routine').array().$type<RoutineTag[]>().notNull().default(sql`'{}'`),
    preferences: text('preferences').array().$type<PreferencesTag[]>().notNull().default(sql`'{}'`),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('user_products_user_product_unique').on(t.userId, t.productId),
    index('user_products_status_idx').on(t.status),
    check('user_products_sentiment_range', sql`${t.sentiment} BETWEEN 1 AND 6`),
    ...tenantPolicies('user_products', t.userId),
    // #7 — let anon traverse user_products when a public review hangs off the
    // row. Without it, `listPublicReviewsForProduct` (joins) and
    // `profiles_select_for_public_review` (EXISTS sub-join) silently filter
    // every row. Wrapping the EXISTS check in `user_product_has_public_review`
    // (SECURITY DEFINER, migration 0067) breaks the cycle with
    // user_product_reviews_tenant_isolation, which itself reads user_products.
    pgPolicy('user_products_select_for_public_review', {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`public.user_product_has_public_review(${t.id})`,
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
    isPublic: boolean('is_public').notNull().default(false),
    ...moderationColumns,
    ...timestamps,
  },
  (t) => [
    index('user_product_reviews_user_product_idx').on(t.userProductId),
    // Speeds up the public product reviews surface (#7); only public rows hit it.
    index('user_product_reviews_public_idx')
      .on(t.userProductId)
      .where(sql`${t.isPublic} = true`),
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
    // Additive SELECT-only policy: any role can read rows opted-in as public.
    // Owner CRUD still funneled through fkTenantPolicies above.
    pgPolicy('user_product_reviews_select_public', {
      as: 'permissive',
      for: 'select',
      to: appRuntimeRole,
      using: sql`${t.isPublic} = true`,
    }),
  ]
).enableRLS()

export type UserProduct = typeof userProducts.$inferSelect
export type UserProductInsert = typeof userProducts.$inferInsert
export type UserProductReview = typeof userProductReviews.$inferSelect
export type UserProductReviewInsert = typeof userProductReviews.$inferInsert
