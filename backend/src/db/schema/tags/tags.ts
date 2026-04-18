import { relevanceValues } from '@habit-tracker/shared'

import { sql } from 'drizzle-orm'
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { ingredients } from '../ingredients/ingredients'
import { products } from '../products/products'

// Each domain has its own tag table. Slugs can be identical across
// domains (e.g. 'peau-grasse' exists in both) — they are independent rows.

export const ingredientTagsDefs = pgTable(
  'ingredient_tags',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    tagType: text('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ingredient_tags_slug_unique').on(t.slug),
    index('ingredient_tags_type_idx').on(t.tagType),
  ]
)

export const productTagsDefs = pgTable(
  'product_tags',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    tagType: text('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('product_tags_slug_unique').on(t.slug),
    index('product_tags_type_idx').on(t.tagType),
  ]
)

// Junction tables — composite PK = uniqueness constraint
export const relevanceEnum = pgEnum('relevance', relevanceValues)

export const tagIngredients = pgTable(
  'tag_ingredients',
  {
    ingredientTagId: uuid('ingredient_tag_id')
      .notNull()
      .references(() => ingredientTagsDefs.id, { onDelete: 'cascade' }),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    relevance: relevanceEnum('relevance').notNull().default('secondary'),
  },
  (t) => [primaryKey({ columns: [t.ingredientTagId, t.ingredientId] })]
)

export const tagProducts = pgTable(
  'tag_products',
  {
    productTagId: uuid('product_tag_id')
      .notNull()
      .references(() => productTagsDefs.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    relevance: relevanceEnum('relevance').notNull().default('secondary'),
  },
  (t) => [primaryKey({ columns: [t.productTagId, t.productId] })]
)

export type IngredientTagDef = typeof ingredientTagsDefs.$inferSelect
export type ProductTagDef = typeof productTagsDefs.$inferSelect
export type TagIngredient = typeof tagIngredients.$inferSelect
export type TagProduct = typeof tagProducts.$inferSelect
