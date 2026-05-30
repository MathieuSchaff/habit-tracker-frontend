import { relevanceValues, type TagSource } from '@aurore/shared'

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

import { catalogPolicies } from '../_policies'
import { ingredients } from '../ingredients/ingredients'
import { products } from '../products/products'

// Each domain has its own tag table. Slugs can be identical across
// domains (e.g. 'peau-grasse' exists in both) — they are independent rows.

export const ingredientTagTypes = pgTable(
  'ingredient_tag_types',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    tagType: text('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('ingredient_tag_types_slug_unique').on(t.slug),
    index('ingredient_tag_types_type_idx').on(t.tagType),
    ...catalogPolicies('ingredient_tag_types', 'admin'),
  ]
).enableRLS()

export const productTagTypes = pgTable(
  'product_tag_types',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    tagType: text('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('product_tag_types_slug_unique').on(t.slug),
    index('product_tag_types_type_idx').on(t.tagType),
    ...catalogPolicies('product_tag_types', 'admin'),
  ]
).enableRLS()

// Junction tables — composite PK = uniqueness constraint
export const relevanceEnum = pgEnum('relevance', relevanceValues)

export const ingredientTagLinks = pgTable(
  'ingredient_tag_links',
  {
    ingredientTagId: uuid('ingredient_tag_id')
      .notNull()
      .references(() => ingredientTagTypes.id, { onDelete: 'cascade' }),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    relevance: relevanceEnum('relevance').notNull().default('secondary'),
  },
  (t) => [
    primaryKey({ columns: [t.ingredientTagId, t.ingredientId] }),
    ...catalogPolicies('ingredient_tag_links', 'admin'),
  ]
).enableRLS()

export const productTagLinks = pgTable(
  'product_tag_links',
  {
    productTagId: uuid('product_tag_id')
      .notNull()
      .references(() => productTagTypes.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    relevance: relevanceEnum('relevance').notNull().default('secondary'),
    // Origin of the row — `manual` (any product-tags CRUD path) or one of the
    // AutoTagSource values produced by the auto-tag orchestrator. Auto-tag
    // intake deletes only rows where source != 'manual' before re-inserting,
    // so manual curation survives retag cycles. Default 'manual' makes the
    // pre-existing rows safe through the migration.
    source: text('source').$type<TagSource>().notNull().default('manual'),
  },
  (t) => [
    primaryKey({ columns: [t.productTagId, t.productId] }),
    ...catalogPolicies('product_tag_links', 'contributor'),
  ]
).enableRLS()

export type IngredientTagType = typeof ingredientTagTypes.$inferSelect
export type ProductTagType = typeof productTagTypes.$inferSelect
export type IngredientTagLink = typeof ingredientTagLinks.$inferSelect
export type ProductTagLink = typeof productTagLinks.$inferSelect
