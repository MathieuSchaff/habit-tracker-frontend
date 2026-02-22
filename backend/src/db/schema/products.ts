import type { ProductChanges } from '@habit-tracker/shared'

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

import { users } from './users'

export const collaboratorRoleEnum = pgEnum('collaborator_role', ['editor'])

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    brand: text('brand').notNull(),
    // complémentents alimentaires, skincare etc...
    kind: text('kind').notNull().default('Pas spécifié'),
    // gouttes, gélules, pump ( pour la skincare), etc...
    // amountUnit existe parce que parfois l'unité de dosage
    //  et l'unité de contenance diffèrent (tu doses en "gouttes" mais le flacon est en "mL"). Quand c'est la même (gélules/gélules),
    //  amountUnit peut être null, alors
    //   ça veut dire que c'est identique à unit.
    unit: text('unit').notNull(),
    inci: text('inci'),
    description: text('description'),
    // combien? 200, 60, etc
    totalAmount: integer('total_amount'),
    // ml, gélules, litres, etc
    amountUnit: text('amount_unit'),
    slug: text('slug').notNull(),
    url: text('url'),
    notes: text('notes'),
    priceCents: integer('price_cents'),
    expiresAt: text('expires_at'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('products_kind_idx').on(t.kind),
    index('products_created_by_idx').on(t.createdBy),
    uniqueIndex('products_name_brand_unique').on(t.name, t.brand),
    uniqueIndex('products_slug_unique').on(t.slug),
  ]
)

export const productStock = pgTable(
  'product_stock',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    qty: integer('qty').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('product_stock_user_product_unique').on(t.userId, t.productId),
    index('product_stock_user_idx').on(t.userId),
  ]
)

export const productEdits = pgTable(
  'product_edits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
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

export type ProductEdit = typeof productEdits.$inferSelect
export type Product = typeof products.$inferSelect
export type CreateProductInputDrizzle = typeof products.$inferInsert
export type ProductStock = typeof productStock.$inferSelect
export type ProductEditInsert = typeof productEdits.$inferInsert
