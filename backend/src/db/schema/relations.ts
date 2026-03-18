import { relations } from 'drizzle-orm'

import { ingredients } from './ingredients'
import { productIngredients } from './product-ingredients'
import { products } from './products'
import { userProducts } from './user-products'

export const productsRelations = relations(products, ({ many }) => ({
  productIngredients: many(productIngredients),
  userProducts: many(userProducts),
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
