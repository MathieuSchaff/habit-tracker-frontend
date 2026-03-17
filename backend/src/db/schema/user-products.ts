import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { products } from './products'
import { users } from './users'

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
    qty: integer('qty').notNull().default(0),
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
  ]
)

export const userProductsRelations = relations(userProducts, ({ one }) => ({
  user: one(users, {
    fields: [userProducts.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [userProducts.productId],
    references: [products.id],
  }),
  review: one(userProductReviews, {
    fields: [userProducts.id],
    references: [userProductReviews.userProductId],
  }),
}))

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
  (t) => [index('user_product_reviews_user_product_idx').on(t.userProductId)]
)

export const userProductReviewsRelations = relations(userProductReviews, ({ one }) => ({
  userProduct: one(userProducts, {
    fields: [userProductReviews.userProductId],
    references: [userProducts.id],
  }),
}))

export type UserProduct = typeof userProducts.$inferSelect
export type UserProductInsert = typeof userProducts.$inferInsert
export type UserProductReview = typeof userProductReviews.$inferSelect
export type UserProductReviewInsert = typeof userProductReviews.$inferInsert
