import type {
  CreateProductInput,
  ListProductsFilters,
  ProductKind,
  ProductSearchResult,
  ProductUnit,
  UpdateProductInput,
} from '@habit-tracker/shared'
import {
  type AllProductTagCategory,
  DENTAL_PRODUCT_TAG_CATEGORIES,
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
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
  gte,
  ilike,
  inArray,
  lte,
  notInArray,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { ingredients, productIngredients } from 'src/db/schema'
import { listIngredientsByProduct } from 'src/features/products/product-ingredients/product-ingredients.service'

import { db } from '../../db'
import type { Database, DB } from '../../db/index'
import { type Product, products } from '../../db/schema/products'
import { productTagsDefs, tagProducts } from '../../db/schema/tags/tags'
import { escapeLike, isUniqueViolation } from '../../lib/helpers'
import { buildChanges, logEdit, productEditConfig } from '../../lib/logs'
import { ProductError } from './product-error'

export async function createProduct(userId: string, input: CreateProductInput, database: DB = db) {
  try {
    const normalize = (s: string) => s.trim().replace(/\s+/g, ' ')
    const name = normalize(input.name)
    const brand = normalize(input.brand)
    const slug = input.slug ?? `${name}${brand ? `-${brand}` : ''}`
    const [product] = await database
      .insert(products)
      .values({
        ...input,
        createdBy: userId,
        name,
        brand,
        kind: normalize(input.kind) as ProductKind,
        unit: normalize(input.unit) as ProductUnit,
        amountUnit: input.amountUnit ? normalize(input.amountUnit) : input.amountUnit,
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

  const changes = buildChanges(row, TRACKED_FIELDS, newProduct)

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
  'id' | 'slug' | 'name' | 'brand' | 'kind' | 'unit' | 'priceCents' | 'totalAmount' | 'amountUnit'
>
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

  if (filters.ingredient) {
    const slugs = Array.isArray(filters.ingredient)
      ? filters.ingredient
      : filters.ingredient.split(',')
    if (slugs.length > 0) {
      conditions.push(
        inArray(
          products.id,
          database
            .select({ productId: productIngredients.productId })
            .from(productIngredients)
            .innerJoin(ingredients, eq(productIngredients.ingredientId, ingredients.id))
            .where(inArray(ingredients.slug, slugs))
        )
      )
    }
  }

  const tagFilterCondition = (raw: string, tagType: string): SQL =>
    inArray(
      products.id,
      database
        .select({ productId: tagProducts.productId })
        .from(tagProducts)
        .innerJoin(productTagsDefs, eq(tagProducts.productTagId, productTagsDefs.id))
        .where(
          and(inArray(productTagsDefs.slug, raw.split(',')), eq(productTagsDefs.tagType, tagType))
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

  if (filters.avoid_for) {
    const slugs = filters.avoid_for.split(',').filter(Boolean)
    if (slugs.length > 0) {
      conditions.push(
        notInArray(
          products.id,
          database
            .select({ productId: tagProducts.productId })
            .from(tagProducts)
            .innerJoin(productTagsDefs, eq(tagProducts.productTagId, productTagsDefs.id))
            .where(and(inArray(productTagsDefs.slug, slugs), eq(tagProducts.relevance, 'avoid')))
        )
      )
    }
  }

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
      })
      .from(products)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    database.select({ total: count() }).from(products).where(where),
  ])

  const total = countResult[0]?.total ?? 0
  return { items, total, page, limit }
}
export type FilterOptions = {
  kinds: string[]
  brands: string[]
  tags: Partial<Record<AllProductTagCategory, { name: string; slug: string; count: number }[]>>
}

export async function getFilterOptions(
  database: Database = db,
  category?: ProductDomainTab
): Promise<FilterOptions> {
  const dbCategories = category ? [...PRODUCT_DOMAIN_DB_CATEGORIES[category]] : null
  const productScope = dbCategories ? inArray(products.category, dbCategories) : undefined

  // Resolve which tag categories to expose for this domain tab.
  // No-category (admin/all view): deduplicated union across all 4 domains.
  const filterCategories: readonly AllProductTagCategory[] = category
    ? DOMAIN_PRODUCT_FILTER_CATEGORIES[category]
    : ([
        ...new Set(Object.values(DOMAIN_PRODUCT_FILTER_CATEGORIES).flat()),
      ] as AllProductTagCategory[])

  // count is the number of distinct products associated with a given tag,
  // all relevances combined — aligned with the current tag filter logic in
  // listProducts (no relevance filter on positive filters).
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
        name: productTagsDefs.label,
        slug: productTagsDefs.slug,
        category: productTagsDefs.tagType,
        count: count(tagProducts.productId),
      })
      .from(productTagsDefs)
      .innerJoin(tagProducts, eq(productTagsDefs.id, tagProducts.productTagId))
      .innerJoin(products, eq(tagProducts.productId, products.id))
      .where(
        dbCategories
          ? and(
              inArray(productTagsDefs.tagType, filterCategories as string[]),
              inArray(products.category, dbCategories)
            )
          : inArray(productTagsDefs.tagType, filterCategories as string[])
      )
      .groupBy(
        productTagsDefs.id,
        productTagsDefs.label,
        productTagsDefs.slug,
        productTagsDefs.tagType
      )
      .orderBy(productTagsDefs.tagType, productTagsDefs.label),
  ])

  const tagsByCategory = Object.fromEntries(
    filterCategories.map((c) => [c, []])
  ) as FilterOptions['tags']

  for (const tag of tagRows) {
    if (!tag.category) continue
    const bucket = tag.category as AllProductTagCategory
    if (bucket in tagsByCategory) {
      tagsByCategory[bucket]!.push({ name: tag.name, slug: tag.slug, count: tag.count })
    }
  }

  return {
    kinds: kindRows.map((r) => r.kind),
    brands: brandRows.map((r) => r.brand),
    tags: tagsByCategory,
  }
}
export async function getDistinctBrands(database: Database = db): Promise<string[]> {
  const rows = await database
    .selectDistinct({ brand: products.brand })
    .from(products)
    .orderBy(asc(products.brand))
  return rows.map((r) => r.brand)
}

export async function deleteProduct(userId: string, id: string, database: Database = db): Promise<void> {
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

// Simple search by name or brand
export async function searchProducts(
  filters: { q: string; limit?: number },
  database: Database = db
): Promise<ProductSearchResult[]> {
  const limit = filters.limit ?? 8
  const q = filters.q.trim()
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
      or(
        ilike(products.name, `%${escapeLike(q)}%`),
        ilike(products.brand, `%${escapeLike(q)}%`),
        sql`similarity(lower(${products.name}), lower(${q})) > 0.3`,
        sql`similarity(lower(${products.brand}), lower(${q})) > 0.3`
      )
    )
    .limit(limit)
    .orderBy(
      sql`GREATEST(
              similarity(lower(${products.name}), lower(${q})),
              similarity(lower(${products.brand}), lower(${q}))
            ) DESC`,
      products.name
    )
}
