import { relations } from 'drizzle-orm'

import { ingredients } from './ingredients'
import { productIngredients } from './product-ingredients'
import { products } from './products'
import { productTags, tags } from './tags'
import { userProducts } from './user-products'

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
