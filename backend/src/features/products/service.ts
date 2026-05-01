import type {
  CreateProductInput,
  ListProductsFilters,
  ProductKind,
  ProductSearchPage,
  ProductSearchResult,
  ProductUnit,
  UpdateProductInput,
} from '@habit-tracker/shared'
import {
  DENTAL_PRODUCT_TAG_CATEGORIES,
  HAIRCARE_PRODUCT_TAG_CATEGORIES,
  PRODUCT_DOMAIN_DB_CATEGORIES,
  type ProductDomainTab,
  SKINCARE_PRODUCT_TAG_CATEGORIES,
  SUPPLEMENT_PRODUCT_TAG_CATEGORIES,
} from '@habit-tracker/shared'

import slugify from '@sindresorhus/slugify'
import {
  and,
  asc,
  count,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'

import { db } from '../../db'
import type { Database, DB } from '../../db/index'
import { ingredients, productIngredients } from '../../db/schema'
import { type Product, products } from '../../db/schema/products'
import { productTagsDefs, tagProducts } from '../../db/schema/tags/tags'
import { escapeLike, isUniqueViolation } from '../../lib/helpers'
import { buildChanges, logEdit, productEditConfig } from '../../lib/logs'
import { ProductError } from './product-error'
import { listIngredientsByProduct } from './product-ingredients/product-ingredients.service'

// Trim + collapse internal whitespace. Applied to all user-typed string fields
// so that update and create write identical normalized values.
const normalizeString = (s: string) => s.trim().replace(/\s+/g, ' ')

const NORMALIZED_STRING_FIELDS = ['name', 'brand', 'kind', 'unit', 'amountUnit'] as const

export async function createProduct(userId: string, input: CreateProductInput, database: DB = db) {
  try {
    const name = normalizeString(input.name)
    const brand = normalizeString(input.brand)
    const slug = input.slug ?? `${name}${brand ? `-${brand}` : ''}`
    const [product] = await database
      .insert(products)
      .values({
        ...input,
        createdBy: userId,
        name,
        brand,
        kind: normalizeString(input.kind) as ProductKind,
        unit: normalizeString(input.unit) as ProductUnit,
        amountUnit: input.amountUnit ? normalizeString(input.amountUnit) : input.amountUnit,
        slug: slugify(slug),
      })
      .returning()

    if (!product) throw new ProductError('product_creation_failed')

    return product
  } catch (e) {
    if (e instanceof ProductError) throw e
    if (isUniqueViolation(e)) throw new ProductError('product_already_exists')
    throw e
  }
}
async function getProductRow(condition: SQL, database: Database) {
  const row = await database
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      brand: products.brand,
      category: products.category,
      description: products.description,
      inci: products.inci,
      totalAmount: products.totalAmount,
      amountUnit: products.amountUnit,
      url: products.url,
      imageUrl: products.imageUrl,
      unit: products.unit,
      priceCents: products.priceCents,
      kind: products.kind,
      notes: products.notes,
    })
    .from(products)
    .where(condition)
    .limit(1)
  return row[0] ?? null
}

export async function getProductById(id: string, database: Database = db) {
  const row = await getProductRow(eq(products.id, id), database)
  if (!row) throw new ProductError('product_not_found')
  return row
}

export async function getProductBySlug(slug: string, database: Database = db) {
  const row = await getProductRow(eq(products.slug, slug), database)
  if (!row) throw new ProductError('product_not_found')
  return row
}

// I need the product but also the ingredients list in one time
export async function getProductWithIngredientsBySlug(slug: string, database: Database = db) {
  const product = await getProductBySlug(slug, database)
  const ingredients = await listIngredientsByProduct(database, product.id)
  return {
    ...product,
    ingredients,
  }
}

const EXCLUDED_KEYS = new Set(['id', 'createdBy', 'createdAt'])

const TRACKED_FIELDS = [
  'name',
  'brand',
  'category',
  'kind',
  'unit',
  'inci',
  'description',
  'totalAmount',
  'amountUnit',
  'slug',
  'url',
  'imageUrl',
  'notes',
  'priceCents',
] as const

function isColumnLike(obj: unknown): obj is { name: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as Record<string, unknown>).name === 'string'
  )
}

// We update the product and we must save what changed in the logs
export async function updateProduct(
  userId: string,
  id: string,
  data: UpdateProductInput,
  summary?: string,
  database = db
): Promise<Product> {
  for (const field of NORMALIZED_STRING_FIELDS) {
    const v = data[field]
    if (typeof v === 'string') {
      ;(data as Record<string, unknown>)[field] = normalizeString(v)
    }
  }

  const slug = data.slug ?? (data.name ? slugify(data.name) : undefined)
  if (slug !== undefined) data.slug = slug

  const setEntries = Object.entries(data).filter(([k]) => !EXCLUDED_KEYS.has(k))

  if (setEntries.length === 0) {
    const existing = await database.query.products.findFirst({ where: eq(products.id, id) })
    if (!existing) throw new ProductError('product_not_found')
    return existing
  }

  const setClauses = setEntries.map(([k, v]) => {
    const col = products[k as keyof typeof products]
    if (!isColumnLike(col)) throw new ProductError('product_update_failed')
    return sql`${sql.identifier(col.name)} = ${v}`
  })

  // This is a special SQL to update and get the old values at the same time for the logs
  const result = await database.execute(sql`
    UPDATE ${products}
    SET ${sql.join(setClauses, sql`, `)}
    WHERE ${products.id} = ${id}
    RETURNING
      ${products}.*,
      ${sql.join(
        TRACKED_FIELDS.map((f) => {
          const col = products[f as keyof typeof products]
          if (!isColumnLike(col)) throw new ProductError('product_update_failed')
          return sql`OLD.${sql.identifier(col.name)} AS ${sql.identifier(`old_${f}`)}`
        }),
        sql`, `
      )}
  `)

  const row = result[0] as Record<string, unknown> | undefined
  if (!row) throw new ProductError('product_not_found')

  // I convert the database columns names back to the object format
  const newProduct: Record<string, unknown> = {}
  for (const [key, col] of Object.entries(products)) {
    if (isColumnLike(col)) {
      newProduct[key] = row[col.name]
    }
  }

  const oldProduct: Record<string, unknown> = {}
  for (const f of TRACKED_FIELDS) {
    oldProduct[f] = row[`old_${f}`]
  }

  const changes = buildChanges(oldProduct, newProduct, TRACKED_FIELDS)

  await logEdit(database, productEditConfig, {
    entityId: id,
    editedBy: userId,
    summary: summary ?? null,
    changes,
  })

  return newProduct as Product
}

export type ProductSummary = Pick<
  Product,
  | 'id'
  | 'slug'
  | 'name'
  | 'brand'
  | 'kind'
  | 'unit'
  | 'priceCents'
  | 'totalAmount'
  | 'amountUnit'
  | 'imageUrl'
> & {
  // Avoid-tag slugs matching the caller's profile (avoid_for). Empty when no
  // profile filter is active. Drives the "Éviter" badge on cards.
  profileMatches: string[]
  // Positive tags (relevance != 'avoid'). Card filters relevance='primary' to
  // show top 3 chips; tagType drives chip styling (concern/skin_type/label).
  tags: { slug: string; tagType: string; relevance: 'primary' | 'secondary' }[]
}
export type ProductsPage = {
  items: ProductSummary[]
  total: number
  page: number
  limit: number
}

// This is the search with many filters
export async function listProducts(
  filters: ListProductsFilters,
  database: Database = db
): Promise<ProductsPage> {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const offset = (page - 1) * limit

  const conditions: SQL[] = []

  conditions.push(inArray(products.category, [...PRODUCT_DOMAIN_DB_CATEGORIES[filters.category]]))

  if (filters.kind) {
    const kinds = Array.isArray(filters.kind) ? filters.kind : filters.kind.split(',')
    conditions.push(
      kinds.length === 1
        ? eq(products.kind, kinds[0] as ProductKind)
        : inArray(products.kind, kinds as ProductKind[])
    )
  }

  if (filters.brand) {
    const brands = Array.isArray(filters.brand) ? filters.brand : filters.brand.split(',')
    conditions.push(
      brands.length === 1 ? eq(products.brand, brands[0]) : inArray(products.brand, brands)
    )
  }

  // Correlated EXISTS lets the planner short-circuit on first match per product
  // and use product_ingredients_product_idx as the driving index. The previous
  // `IN (SELECT ...)` materialized the full slug→productId set upfront.
  if (filters.ingredient) {
    const slugs = Array.isArray(filters.ingredient)
      ? filters.ingredient
      : filters.ingredient.split(',')
    if (slugs.length > 0) {
      conditions.push(
        exists(
          database
            .select({ one: sql`1` })
            .from(productIngredients)
            .innerJoin(ingredients, eq(productIngredients.ingredientId, ingredients.id))
            .where(
              and(eq(productIngredients.productId, products.id), inArray(ingredients.slug, slugs))
            )
        )
      )
    }
  }

  const tagFilterCondition = (raw: string, tagType: string): SQL =>
    exists(
      database
        .select({ one: sql`1` })
        .from(tagProducts)
        .innerJoin(productTagsDefs, eq(tagProducts.productTagId, productTagsDefs.id))
        .where(
          and(
            eq(tagProducts.productId, products.id),
            inArray(productTagsDefs.slug, raw.split(',')),
            eq(productTagsDefs.tagType, tagType)
          )
        )
    )

  // Tag filters dispatched per domain — categories come from the shared taxonomy
  // (single source of truth: shared/src/products/{domain}/tag-taxonomy.ts).
  if (filters.category === 'skincare') {
    for (const tagType of SKINCARE_PRODUCT_TAG_CATEGORIES) {
      const value = filters[tagType]
      if (!value) continue
      conditions.push(tagFilterCondition(value, tagType))
    }
  } else if (filters.category === 'haircare') {
    for (const tagType of HAIRCARE_PRODUCT_TAG_CATEGORIES) {
      const value = filters[tagType]
      if (!value) continue
      conditions.push(tagFilterCondition(value, tagType))
    }
  } else if (filters.category === 'dental') {
    for (const tagType of DENTAL_PRODUCT_TAG_CATEGORIES) {
      const value = filters[tagType]
      if (!value) continue
      conditions.push(tagFilterCondition(value, tagType))
    }
  } else if (filters.category === 'complement') {
    for (const tagType of SUPPLEMENT_PRODUCT_TAG_CATEGORIES) {
      const value = filters[tagType]
      if (!value) continue
      conditions.push(tagFilterCondition(value, tagType))
    }
  }

  // Price range — NULL priceCents is excluded when either bound is active
  // (NULL comparisons in SQL are falsy, so gte/lte naturally drops them).
  if (filters.priceMin !== undefined) {
    conditions.push(gte(products.priceCents, filters.priceMin))
  }
  if (filters.priceMax !== undefined) {
    conditions.push(lte(products.priceCents, filters.priceMax))
  }

  // Free-text fallback: ILIKE on name OR brand. Used when the header search
  // matched neither a known brand nor a known ingredient.
  if (filters.q) {
    const escaped = escapeLike(filters.q)
    conditions.push(
      or(ilike(products.name, `%${escaped}%`), ilike(products.brand, `%${escaped}%`)) as SQL
    )
  }

  // avoid_for is computed post-fetch as per-product profileMatches (badge UX)
  // rather than excluding rows — keeps the catalog visible while flagging risks.
  const avoidSlugs = filters.avoid_for ? filters.avoid_for.split(',').filter(Boolean) : []

  const where = conditions.length > 0 ? and(...conditions) : undefined

  // NULLS LAST on price/date sorts so products without the field
  // don't surface at the top of the list.
  const orderBy = (() => {
    switch (filters.sort) {
      case 'random':
        return sql`random()`
      case 'price_asc':
        return sql`${products.priceCents} ASC NULLS LAST`
      case 'price_desc':
        return sql`${products.priceCents} DESC NULLS LAST`
      case 'newest':
        return sql`${products.createdAt} DESC NULLS LAST`
      default:
        return products.name
    }
  })()

  const [items, countResult] = await Promise.all([
    database
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        brand: products.brand,
        kind: products.kind,
        unit: products.unit,
        priceCents: products.priceCents,
        totalAmount: products.totalAmount,
        amountUnit: products.amountUnit,
        imageUrl: products.imageUrl,
      })
      .from(products)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    database.select({ total: count() }).from(products).where(where),
  ])

  const total = countResult[0]?.total ?? 0

  const matchesByProduct = new Map<string, string[]>()
  const tagsByProduct = new Map<string, ProductSummary['tags']>()

  if (items.length > 0) {
    const itemIds = items.map((i) => i.id)

    const [avoidRows, positiveTagRows] = await Promise.all([
      avoidSlugs.length > 0
        ? database
            .select({ productId: tagProducts.productId, slug: productTagsDefs.slug })
            .from(tagProducts)
            .innerJoin(productTagsDefs, eq(tagProducts.productTagId, productTagsDefs.id))
            .where(
              and(
                inArray(tagProducts.productId, itemIds),
                inArray(productTagsDefs.slug, avoidSlugs),
                eq(tagProducts.relevance, 'avoid')
              )
            )
        : Promise.resolve([] as { productId: string; slug: string }[]),
      // Positive tags only (relevance != 'avoid') drive card chips. Avoid is
      // already handled by profileMatches above and would otherwise duplicate.
      database
        .select({
          productId: tagProducts.productId,
          slug: productTagsDefs.slug,
          tagType: productTagsDefs.tagType,
          relevance: tagProducts.relevance,
        })
        .from(tagProducts)
        .innerJoin(productTagsDefs, eq(tagProducts.productTagId, productTagsDefs.id))
        .where(and(inArray(tagProducts.productId, itemIds), ne(tagProducts.relevance, 'avoid'))),
    ])

    for (const row of avoidRows) {
      const list = matchesByProduct.get(row.productId) ?? []
      list.push(row.slug)
      matchesByProduct.set(row.productId, list)
    }

    for (const row of positiveTagRows) {
      const list = tagsByProduct.get(row.productId) ?? []
      list.push({
        slug: row.slug,
        tagType: row.tagType,
        relevance: row.relevance as 'primary' | 'secondary',
      })
      tagsByProduct.set(row.productId, list)
    }
  }

  const itemsWithMatches: ProductSummary[] = items.map((i) => ({
    ...i,
    profileMatches: matchesByProduct.get(i.id) ?? [],
    tags: tagsByProduct.get(i.id) ?? [],
  }))

  return { items: itemsWithMatches, total, page, limit }
}
export type FilterOptions = {
  kinds: string[]
  brands: string[]
  // Slug → number of products tagged. Only slugs with ≥1 product are present;
  // the frontend iterates the shared taxonomy to drive chips and reads counts
  // from this map (missing slug → count 0 → disabled chip).
  tagCounts: Record<string, number>
}

export async function getFilterOptions(
  database: Database = db,
  category?: ProductDomainTab
): Promise<FilterOptions> {
  const dbCategories = category ? [...PRODUCT_DOMAIN_DB_CATEGORIES[category]] : null
  const productScope = dbCategories ? inArray(products.category, dbCategories) : undefined

  const [kindRows, brandRows, tagRows] = await Promise.all([
    database
      .selectDistinct({ kind: products.kind })
      .from(products)
      .where(productScope)
      .orderBy(products.kind),
    database
      .selectDistinct({ brand: products.brand })
      .from(products)
      .where(productScope)
      .orderBy(products.brand),
    database
      .select({
        slug: productTagsDefs.slug,
        count: count(tagProducts.productId),
      })
      .from(productTagsDefs)
      .innerJoin(tagProducts, eq(productTagsDefs.id, tagProducts.productTagId))
      .innerJoin(products, eq(tagProducts.productId, products.id))
      .where(productScope)
      .groupBy(productTagsDefs.id, productTagsDefs.slug),
  ])

  const tagCounts: Record<string, number> = {}
  for (const r of tagRows) tagCounts[r.slug] = r.count

  return {
    kinds: kindRows.map((r) => r.kind),
    brands: brandRows.map((r) => r.brand),
    tagCounts,
  }
}
export async function getDistinctBrands(database: Database = db): Promise<string[]> {
  const rows = await database
    .selectDistinct({ brand: products.brand })
    .from(products)
    .orderBy(asc(products.brand))
  return rows.map((r) => r.brand)
}

export async function deleteProduct(
  userId: string,
  id: string,
  database: Database = db
): Promise<void> {
  const product = await database.query.products.findFirst({ where: eq(products.id, id) })
  if (!product) throw new ProductError('product_not_found')
  if (product.createdBy !== userId) throw new ProductError('unauthorized_access')

  await database.delete(products).where(eq(products.id, id))
}

// We look for products that look the same to avoid duplicates
export async function findSimilarProducts(
  name: string,
  brand: string,
  database: Database = db
): Promise<ProductSearchResult[]> {
  const trimmedName = name.trim()
  const trimmedBrand = brand.trim()
  if (!trimmedName || !trimmedBrand) return []

  return database
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      kind: products.kind,
      slug: products.slug,
    })
    .from(products)
    .where(
      and(
        or(
          sql`lower(${products.brand}) = lower(${trimmedBrand})`,
          sql`similarity(lower(${products.brand}), lower(${trimmedBrand})) > 0.5`
        ),
        or(
          sql`similarity(lower(${products.name}), lower(${trimmedName})) > 0.3`,
          ilike(products.name, `%${escapeLike(trimmedName)}%`)
        )
      )
    )
    .limit(5)
    .orderBy(sql`similarity(lower(${products.name}), lower(${trimmedName})) DESC`, products.name)
}

// Simple search by name or brand. Paginates via offset; fetches limit+1 rows
// to detect whether more pages remain without a separate COUNT(*) query.
export async function searchProducts(
  filters: { q: string; limit?: number; offset?: number },
  database: Database = db
): Promise<ProductSearchPage> {
  const limit = filters.limit ?? 8
  const offset = filters.offset ?? 0
  const q = filters.q.trim()
  const rows = await database
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      kind: products.kind,
      slug: products.slug,
    })
    .from(products)
    .where(
      or(
        ilike(products.name, `%${escapeLike(q)}%`),
        ilike(products.brand, `%${escapeLike(q)}%`),
        sql`similarity(lower(${products.name}), lower(${q})) > 0.3`,
        sql`similarity(lower(${products.brand}), lower(${q})) > 0.3`
      )
    )
    .limit(limit + 1)
    .offset(offset)
    .orderBy(
      sql`GREATEST(
              similarity(lower(${products.name}), lower(${q})),
              similarity(lower(${products.brand}), lower(${q}))
            ) DESC`,
      products.name
    )
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  return { items, hasMore, nextOffset: offset + limit }
}
