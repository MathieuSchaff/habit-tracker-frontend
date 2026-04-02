import { relations } from 'drizzle-orm'

import { discussionReplies, discussionThreads } from './discussions'
import { ingredients } from './ingredients'
import { productIngredients } from './product-ingredients'
import { products } from './products'
import { productTags, tags } from './tags'
import { userProducts } from './user-products'
import { profiles } from './users'

export const productsRelations = relations(products, ({ many }) => ({
  productIngredients: many(productIngredients),
  userProducts: many(userProducts),
  productTags: many(productTags),
}))

export const productTagsRelations = relations(productTags, ({ one }) => ({
  product: one(products, {
    fields: [productTags.productId],
    references: [products.id],
  }),
  tag: one(tags, {
    fields: [productTags.tagId],
    references: [tags.id],
  }),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  productTags: many(productTags),
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
