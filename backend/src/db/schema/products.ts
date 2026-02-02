import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'

export const productPages = pgTable(
  'product_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    content: text('content').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('product_pages_name_idx').on(t.name)]
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    brand: text('brand'),
    kind: text('kind').notNull(),
    unit: text('unit').notNull(),
    pageId: uuid('page_id').references(() => productPages.id, {
      onDelete: 'set null',
    }),
    priceCents: integer('price_cents'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('products_user_idx').on(t.userId),
    index('products_user_kind_idx').on(t.userId, t.kind),
    index('products_user_archived_idx').on(t.userId, t.archivedAt),
    index('products_page_idx').on(t.pageId),
    uniqueIndex('products_user_name_brand_unique').on(t.userId, t.name, t.brand),
  ]
)

export const productStock = pgTable('product_stock', {
  productId: uuid('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  qty: integer('qty').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
