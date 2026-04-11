import { relations } from 'drizzle-orm'

import { profiles, users } from './auth/users'
import { ingredients } from './ingredients/ingredients'
import { discussionReplies, discussionThreads } from './products/discussions'
import { productIngredients } from './products/product-ingredients'
import { products } from './products/products'
import { purchases } from './products/purchases'
import { userProductReviews, userProducts } from './products/user-products'
import { productTagsDefs, tagProducts } from './tags/tags'

export const productsRelations = relations(products, ({ many }) => ({
  productIngredients: many(productIngredients),
  userProducts: many(userProducts),
  tagProducts: many(tagProducts),
}))

export const tagProductsRelations = relations(tagProducts, ({ one }) => ({
  product: one(products, {
    fields: [tagProducts.productId],
    references: [products.id],
  }),
  productTag: one(productTagsDefs, {
    fields: [tagProducts.productTagId],
    references: [productTagsDefs.id],
  }),
}))

export const productTagsDefsRelations = relations(productTagsDefs, ({ many }) => ({
  tagProducts: many(tagProducts),
}))

export const productIngredientsRelations = relations(productIngredients, ({ one }) => ({
  product: one(products, {
    fields: [productIngredients.productId],
    references: [products.id],
  }),
  ingredient: one(ingredients, {
    fields: [productIngredients.ingredientId],
    references: [ingredients.id],
  }),
}))

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  productIngredients: many(productIngredients),
}))

export const discussionThreadsRelations = relations(discussionThreads, ({ one, many }) => ({
  product: one(products, {
    fields: [discussionThreads.productId],
    references: [products.id],
  }),
  ingredient: one(ingredients, {
    fields: [discussionThreads.ingredientId],
    references: [ingredients.id],
  }),
  author: one(profiles, {
    fields: [discussionThreads.authorId],
    references: [profiles.userId],
  }),
  replies: many(discussionReplies),
}))

export const discussionRepliesRelations = relations(discussionReplies, ({ one }) => ({
  thread: one(discussionThreads, {
    fields: [discussionReplies.threadId],
    references: [discussionThreads.id],
  }),
  author: one(profiles, {
    fields: [discussionReplies.authorId],
    references: [profiles.userId],
  }),
}))

export const userProductsRelations = relations(userProducts, ({ one, many }) => ({
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
  purchases: many(purchases),
}))

export const userProductReviewsRelations = relations(userProductReviews, ({ one }) => ({
  userProduct: one(userProducts, {
    fields: [userProductReviews.userProductId],
    references: [userProducts.id],
  }),
}))

export const purchasesRelations = relations(purchases, ({ one }) => ({
  userProduct: one(userProducts, {
    fields: [purchases.userProductId],
    references: [userProducts.id],
  }),
}))
