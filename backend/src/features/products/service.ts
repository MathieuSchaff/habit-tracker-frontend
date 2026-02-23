import {
  type CreateProductInput,
  type FieldChange,
  type ProductChanges,
  productChangesSchema,
  type UpdateProductInput,
} from '@habit-tracker/shared'

import slugify from '@sindresorhus/slugify'
import { and, count, eq, inArray, type SQL } from 'drizzle-orm'

import { db } from '../../db'
import type { Database } from '../../db/index'
import { type Product, productEdits, products } from '../../db/schema/products'
import { productTags, tags } from '../../db/schema/tags'
import { isUniqueViolation } from '../../lib/helpers'
import { ProductError } from './product-error'

export async function createProduct(
  userId: string,
  input: CreateProductInput,
  database: Database = db
): Promise<Product> {
  try {
    const slug = input.slug ?? `${input.name}${input.brand ? '-' + input.brand : ''}`
    const [product] = await database
      .insert(products)
      .values({
        ...input,
        createdBy: userId,
        name: input.name,
        kind: input.kind,
        unit: input.unit,
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
  const rows = await database.select().from(products).where(condition)
  return rows[0] ?? null
}

export async function getProductById(id: string, database: Database = db): Promise<Product> {
  const row = await getProductRow(eq(products.id, id), database)
  if (!row) throw new ProductError('product_not_found')
  return row
}

export async function getProductBySlug(slug: string, database: Database = db): Promise<Product> {
  const row = await getProductRow(eq(products.slug, slug), database)
  if (!row) throw new ProductError('product_not_found')
  return row
}
const EXCLUDED_KEYS = new Set(['id', 'createdBy', 'createdAt', 'slug'])

function areEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  return a === b
}

export async function updateProduct(
  userId: string,
  id: string,
  data: UpdateProductInput,
  summary?: string,
  database: Database = db
): Promise<Product> {
  const oldProduct = await getProductById(id, database)
  const slug = data.slug ?? (data.name ? slugify(data.name) : undefined)
  if (slug) data.slug = slug

  const newProductRow = await database
    .update(products)
    .set(data)
    .where(eq(products.id, id))
    .returning()

  const newProduct = newProductRow[0]
  if (!newProduct) throw new ProductError('product_update_failed')

  const changes: ProductChanges = {}

  for (const key in data) {
    if (EXCLUDED_KEYS.has(key)) continue

    const k = key as keyof ProductChanges
    const oldVal = oldProduct[k]
    const newVal = newProduct[k]

    if (!areEqual(oldVal, newVal)) {
      ;(changes as Record<string, FieldChange<unknown>>)[k] = {
        old: oldVal ?? null,
        new: newVal ?? null,
      }
    }
  }

  if (Object.keys(changes).length === 0) return newProduct
  const parsed = productChangesSchema.parse(changes)
  await database.insert(productEdits).values({
    productId: oldProduct.id,
    editedBy: userId,
    summary: summary ?? null,
    changes: parsed,
  })

  return newProduct
}
export type ListProductsFilters = {
  kind?: string
  brand?: string
  tag?: string
  page?: number
  limit?: number
}

export type ProductsPage = {
  items: Product[]
  total: number
  page: number
  limit: number
}

export async function listProducts(
  filters: ListProductsFilters = {},
  database: Database = db
): Promise<ProductsPage> {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const offset = (page - 1) * limit

  // Au lieu que d'écrire des if else, on va push dans un tableau et on les combine à la fin
  const conditions: SQL[] = []

  // filtres simples
  if (filters.kind) conditions.push(eq(products.kind, filters.kind))
  if (filters.brand) conditions.push(eq(products.brand, filters.brand))
  // pb: les tags ne sont pas dans la table products
  // on doit chercher sur la table productTag
  // en gros en sql ça donne un truc du genre select productTags.product_id
  // from productTags
  // inner join tags on ....
  // where tags.slut = filters.slug ( la variable)
  // in array c'est le where in
  if (filters.tag) {
    conditions.push(
      inArray(
        products.id,
        database
          .select({ productId: productTags.productId })
          .from(productTags)
          .innerJoin(tags, eq(productTags.tagId, tags.id))
          .where(eq(tags.slug, filters.tag))
      )
    )
  }
  // si j'ai au moins une condition, je les combine avec AND
  // si undefined, drizzle va ignorer le where()
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [items, countResult] = await Promise.all([
    database
      .select()
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

export async function deleteProduct(id: string, database: Database = db): Promise<void> {
  const rows = await database
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id })
  if (!rows[0]) throw new ProductError('product_delete_failed')
}
