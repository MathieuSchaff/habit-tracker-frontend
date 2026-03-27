import type {
  CreateProductInput,
  ProductSearchResult,
  UpdateProductInput,
} from '@habit-tracker/shared'

import slugify from '@sindresorhus/slugify'
import { and, asc, count, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm'
import { ingredients, productIngredients } from 'src/db/schema'
import { listIngredientsByProduct } from 'src/features/products/product-ingredients/product-ingredients.service'

import { db } from '../../db'
import type { Database } from '../../db/index'
import { type Product, products } from '../../db/schema/products'
import { productTags, tags } from '../../db/schema/tags'
import { isUniqueViolation } from '../../lib/helpers'
import { buildChanges, logEdit, productEditConfig } from '../../lib/logs'
import { ProductError } from './product-error'

export async function createProduct(
  userId: string,
  input: CreateProductInput,
  database: Database = db
): Promise<Product> {
  try {
    const normalize = (s: string) => s.trim().replace(/\s+/g, ' ')
    const name = normalize(input.name)
    const brand = normalize(input.brand)
    const slug = input.slug ?? `${name}${brand ? '-' + brand : ''}`
    const [product] = await database
      .insert(products)
      .values({
        ...input,
        createdBy: userId,
        name,
        brand,
        kind: normalize(input.kind),
        unit: normalize(input.unit),
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

  const setEntries = Object.entries(data).filter(([k]) => !EXCLUDED_KEYS.has(k as any))

  if (setEntries.length === 0) {
    const existing = await database.query.products.findFirst({ where: eq(products.id, id) })
    if (!existing) throw new ProductError('product_not_found')
    return existing
  }

  const setClauses = setEntries.map(([k, v]) => {
    const col = products[k as keyof typeof products]
    return sql`${sql.identifier((col as any).name)} = ${v}`
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
          return sql`OLD.${sql.identifier((col as any).name)} AS ${sql.identifier(`old_${f}`)}`
        }),
        sql`, `
      )}
  `)

  const row = result[0] as Record<string, any> | undefined
  if (!row) throw new ProductError('product_not_found')

  // I convert the database columns names back to the object format
  const newProduct = {} as any
  for (const [key, col] of Object.entries(products)) {
    if (typeof col === 'object' && col !== null && 'name' in col) {
      newProduct[key] = row[col.name as string]
    }
  }

  const changes = buildChanges(row, TRACKED_FIELDS, newProduct)

  await logEdit(database, productEditConfig, {
    entityId: id,
    editedBy: userId,
    summary: summary ?? null,
    changes,
  })

  return newProduct
}

export type ListProductsFilters = {
  kind?: string | string[]
  brand?: string | string[]
  routine_step?: string | string[]
  attribute?: string | string[]
  skin_type?: string | string[]
  concern?: string | string[]
  ingredient?: string | string[]
  product_type?: string | string[]
  skin_zone?: string | string[]
  page?: number
  limit?: number
}
export type ProductSummary = Pick<
  Product,
  'id' | 'slug' | 'name' | 'brand' | 'kind' | 'unit' | 'priceCents'
>
export type ProductsPage = {
  items: ProductSummary[]
  total: number
  page: number
  limit: number
}

// This is the search with many filters
export async function listProducts(
  filters: ListProductsFilters = {},
  database: Database = db
): Promise<ProductsPage> {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const offset = (page - 1) * limit

  const conditions: SQL[] = []

  if (filters.kind) {
    const kinds = Array.isArray(filters.kind) ? filters.kind : filters.kind.split(',')
    conditions.push(
      kinds.length === 1 ? eq(products.kind, kinds[0]) : inArray(products.kind, kinds)
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

  const TAG_FILTERS = [
    'routine_step',
    'attribute',
    'skin_type',
    'concern',
    'product_type',
    'skin_zone',
  ] as const

  for (const category of TAG_FILTERS) {
    const value = filters[category]
    if (!value) continue
    const slugs = Array.isArray(value) ? value : value.split(',')
    if (slugs.length === 0) continue
    conditions.push(
      inArray(
        products.id,
        database
          .select({ productId: productTags.productId })
          .from(productTags)
          .innerJoin(tags, eq(productTags.tagId, tags.id))
          .where(and(inArray(tags.slug, slugs), eq(tags.category, category)))
      )
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

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
      })
      .from(products)
      .where(where)
      .orderBy(products.name)
      .limit(limit)
      .offset(offset),
    database.select({ total: count() }).from(products).where(where),
  ])

  const total = countResult[0]?.total ?? 0
  return { items, total, page, limit }
}
type TagsByCategory = {
  routine_step: { name: string; slug: string }[]
  attribute: { name: string; slug: string }[]
  skin_type: { name: string; slug: string }[]
  skin_zone: { name: string; slug: string }[]
  product_type: { name: string; slug: string }[]
  concern: { name: string; slug: string }[]
}
export type FilterOptions = {
  kinds: string[]
  brands: string[]
  tags: TagsByCategory
}

// We get everything the user can use to filter the list
export async function getFilterOptions(database: Database = db): Promise<FilterOptions> {
  const [kindRows, brandRows, tagRows] = await Promise.all([
    database.selectDistinct({ kind: products.kind }).from(products).orderBy(products.kind),
    database.selectDistinct({ brand: products.brand }).from(products).orderBy(products.brand),
    database
      .select({ name: tags.name, slug: tags.slug, category: tags.category })
      .from(tags)
      .orderBy(tags.category, tags.name),
  ])

  const tagsByCategory = tagRows.reduce(
    (acc, tag) => {
      if (!tag.category || !(tag.category in acc)) return acc
      acc[tag.category as keyof TagsByCategory].push({ name: tag.name, slug: tag.slug })
      return acc
    },
    {
      routine_step: [],
      attribute: [],
      skin_type: [],
      skin_zone: [],
      product_type: [],
      concern: [],
    } as TagsByCategory
  )

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

export async function deleteProduct(id: string, database: Database = db): Promise<void> {
  const rows = await database
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id })
  if (!rows[0]) throw new ProductError('product_delete_failed')
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
          ilike(products.name, `%${trimmedName}%`)
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
        ilike(products.name, `%${q}%`),
        ilike(products.brand, `%${q}%`),
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
