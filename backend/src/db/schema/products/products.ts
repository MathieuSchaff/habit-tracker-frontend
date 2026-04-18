import type { ProductChanges } from '@habit-tracker/shared'

import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from '../auth/users'

export const collaboratorRoleEnum = pgEnum('collaborator_role', ['editor'])

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    brand: text('brand').notNull(),
    // broad category: skincare, complément, haircare, etc.
    category: text('category'),
    // specific product type within a category: serum, cleanser, gélule, etc.
    kind: text('kind').notNull().default('Pas spécifié'),
    // amountUnit differs from unit when dosage and container units differ
    // (e.g. dosed in "gouttes" but the bottle is in "mL"). When identical, amountUnit is null.
    unit: text('unit').notNull(),
    inci: text('inci'),
    description: text('description'),
    totalAmount: integer('total_amount'), // 200, 60, etc
    amountUnit: text('amount_unit'), // ml, gélules, litres, etc
    slug: text('slug').notNull(),
    url: text('url'),
    imageUrl: text('image_url'),
    notes: text('notes'),
    priceCents: integer('price_cents'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('products_kind_idx').on(t.kind),
    index('products_created_by_idx').on(t.createdBy),
    uniqueIndex('products_name_brand_unique').on(sql`lower(${t.name})`, sql`lower(${t.brand})`),
    uniqueIndex('products_slug_unique').on(t.slug),
  ]
)

export const productEdits = pgTable(
  'product_edits',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    editedBy: uuid('edited_by')
      .notNull()
      .references(() => users.id),
    changes: jsonb('changes').notNull().$type<ProductChanges>(),
    summary: text('summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('product_edits_product_idx').on(t.productId),
    index('product_edits_user_idx').on(t.editedBy),
  ]
)

export type Product = typeof products.$inferSelect
export type CreateProductInputDrizzle = typeof products.$inferInsert
export type ProductEdit = typeof productEdits.$inferSelect
export type ProductEditInsert = typeof productEdits.$inferInsert
