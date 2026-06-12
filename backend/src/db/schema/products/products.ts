import type {
  Patent,
  ProductCategory,
  ProductChanges,
  ProductKind,
  ProductTexture,
  ProductUnit,
} from '@aurore/shared'

import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { catalogQualityColumns } from '../_catalog'
import { moderationColumns } from '../_moderation'
import { catalogSubmissionPolicies } from '../_policies'
import { timestamps } from '../_timestamps'
import { users } from '../auth/users'

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    brand: text('brand').notNull(),
    category: text('category').notNull().$type<ProductCategory>(),
    kind: text('kind').notNull().$type<ProductKind>(),
    // Orthogonal to `kind`: a cleanser can be gel/mousse/huile/baume. NULL when
    // not yet captured (admin-curated for the long tail). Drives S5 sensoriel tagging.
    texture: text('texture').$type<ProductTexture>(),
    // Differs from amountUnit when dosage and container units differ
    // (e.g. dosed in "gouttes" but bottle in "mL"). When identical, amountUnit is null.
    unit: text('unit').notNull().$type<ProductUnit>(),
    inci: text('inci'),
    description: text('description'),
    totalAmount: integer('total_amount'), // 200, 60, etc
    amountUnit: text('amount_unit'), // ml, gélules, litres, etc
    slug: text('slug').notNull(),
    url: text('url'),
    patents: jsonb('patents').$type<Patent[]>().notNull().default([]),
    imageUrl: text('image_url'),
    notes: text('notes'),
    priceCents: integer('price_cents'),
    ...moderationColumns,
    ...catalogQualityColumns,
    ...timestamps,
  },
  (t) => [
    index('products_kind_idx').on(t.kind),
    index('products_created_by_idx').on(t.createdBy),
    uniqueIndex('products_name_brand_unique_visible')
      .on(sql`norm(${t.name})`, sql`norm(${t.brand})`)
      .where(sql`${t.moderationStatus} = 'visible'`),
    uniqueIndex('products_slug_unique').on(t.slug),
    // Accent-folded search path for autocomplete/list free-text search.
    index('products_name_search_norm_trgm_idx').using(
      'gin',
      sql`search_norm(${t.name}) gin_trgm_ops`
    ),
    index('products_brand_search_norm_trgm_idx').using(
      'gin',
      sql`search_norm(${t.brand}) gin_trgm_ops`
    ),
    check(
      'products_category_check',
      sql`${t.category} IN ('skincare','solaire','complement','haircare','bodycare','dental')`
    ),
    // kind must be valid for its category. Values mirror PRODUCT_KINDS in shared/src/products/kinds.ts.
    // Keep in sync if either set changes. Literal lists for audit-friendliness (see migration 0057).
    check(
      'products_kind_category_check',
      sql`(
        (${t.category} = 'skincare'   AND ${t.kind} IN ('serum','moisturizer','cleanser','toner','exfoliant','eye-cream','mask','mist','essence','spot-treatment','lip-care','balm','oil','primer','patch')) OR
        (${t.category} = 'solaire'    AND ${t.kind} IN ('sunscreen','after-sun','self-tanner')) OR
        (${t.category} = 'complement' AND ${t.kind} IN ('gelule','capsule','ampoule','poudre','sirop','gummy','huile')) OR
        (${t.category} = 'haircare'   AND ${t.kind} IN ('shampoo','conditioner','hair-mask','hair-serum','hair-oil','styling','hair-color')) OR
        (${t.category} = 'bodycare'   AND ${t.kind} IN ('body-lotion','body-oil','body-scrub','body-wash','deodorant','hand-cream','foot-cream')) OR
        (${t.category} = 'dental'     AND ${t.kind} IN ('toothpaste','mouthwash','teeth-whitening','floss'))
      )`
    ),
    check(
      'products_unit_check',
      sql`${t.unit} IN ('pump','dropper','jar','tube','bottle','spray','pack','roller','bar','aerosol','stick','sachet','cartridge','tablet','capsule','gummy','powder','ampoule')`
    ),
    check(
      'products_verify_stamp_check',
      sql`${t.catalogQuality} = 'verified' OR (${t.verifiedBy} IS NULL AND ${t.verifiedAt} IS NULL)`
    ),
    ...catalogSubmissionPolicies('products', t.createdBy),
  ]
).enableRLS()

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
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
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
