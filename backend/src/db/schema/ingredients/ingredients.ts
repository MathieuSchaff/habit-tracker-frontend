import type { IngredientChanges, IngredientType } from '@habit-tracker/shared'

import { sql } from 'drizzle-orm'
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from '../auth/users'

export const ingredients = pgTable(
  'ingredients',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(), // URL-friendly: "retinol", "azelaic-acid"
    description: text('description').notNull().default(''), // short description
    content: text('content').notNull().default(''), // wiki content (markdown)
    type: text('type').notNull().$type<IngredientType>(),
    // Free-text. Values depend on `type`: skincare/haircare/dental → "actif",
    // "humectant", "emollient", "filtre-uv", "tensioactif", "excipient".
    // supplement → "vitamine", "mineral", "carotenoide", "plante", etc.
    category: text('category'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('ingredients_slug_unique').on(t.slug),
    index('ingredients_name_idx').on(t.name),
    index('ingredients_type_idx').on(t.type),
    index('ingredients_category_idx').on(t.category),
    // Trigram GIN feeds `searchIngredients` (ILIKE %q% on name/slug) — used by
    // the upcoming async ingredient autocomplete in the products filter.
    index('ingredients_name_trgm_idx').using('gin', sql`${t.name} gin_trgm_ops`),
    index('ingredients_slug_trgm_idx').using('gin', sql`${t.slug} gin_trgm_ops`),
    check(
      'ingredients_type_check',
      sql`${t.type} IN ('skincare', 'haircare', 'dental', 'supplement')`
    ),
  ]
)

export const ingredientEdits = pgTable(
  'ingredient_edits',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    editedBy: uuid('edited_by')
      .notNull()
      .references(() => users.id),
    changes: jsonb('changes').notNull().$type<IngredientChanges>(),
    summary: text('summary'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    index('ingredient_edits_ingredient_idx').on(t.ingredientId),
    index('ingredient_edits_user_idx').on(t.editedBy),
  ]
)

export type Ingredient = typeof ingredients.$inferSelect
export type IngredientEdit = typeof ingredientEdits.$inferSelect
