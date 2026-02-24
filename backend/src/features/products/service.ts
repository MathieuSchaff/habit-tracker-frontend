import type { ProductErrorCode } from '@habit-tracker/shared'
import {
  type CreateProductInput,
  type FieldChange,
  type ProductChanges,
  productChangesSchema,
  type UpdateProductInput,
} from '@habit-tracker/shared'

import slugify from '@sindresorhus/slugify'
import { and, count, eq, inArray, type SQL, sql } from 'drizzle-orm'

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

// export async function updateProduct(
//   userId: string,
//   id: string,
//   data: UpdateProductInput,
//   summary?: string,
//   database: Database = db
// ): Promise<Product> {
//   const oldProduct = await getProductById(id, database)
//   const slug = data.slug ?? (data.name ? slugify(data.name) : undefined)
//   if (slug) data.slug = slug

//   const newProductRow = await database
//     .update(products)
//     .set(data)
//     .where(eq(products.id, id))
//     .returning()

//   const newProduct = newProductRow[0]
//   if (!newProduct) throw new ProductError('product_update_failed')

//   const changes: ProductChanges = {}

//   for (const key in data) {
//     if (EXCLUDED_KEYS.has(key)) continue

//     const k = key as keyof ProductChanges
//     const oldVal = oldProduct[k]
//     const newVal = newProduct[k]

//     if (!areEqual(oldVal, newVal)) {
//       ;(changes as Record<string, FieldChange<unknown>>)[k] = {
//         old: oldVal ?? null,
//         new: newVal ?? null,
//       }
//     }
//   }

//   if (Object.keys(changes).length === 0) return newProduct
//   const parsed = productChangesSchema.parse(changes)
//   await database.insert(productEdits).values({
//     productId: oldProduct.id,
//     editedBy: userId,
//     summary: summary ?? null,
//     changes: parsed,
//   })

//   return newProduct
// }
//

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
  'expiresAt',
] as const

/**
 * Met à jour un produit existant et enregistre les modifications dans l'historique (product_edits).
 *
 * Utilise PostgreSQL 18+ pour récupérer simultanément l'état ancien (OLD) et nouveau (NEW)
 * dans une seule requête UPDATE + RETURNING, ce qui évite un SELECT préalable et rend
 * l'opération atomique et plus performante.
 *
 * @param userId - ID de l'utilisateur qui effectue la modification
 * @param id - ID du produit à modifier
 * @param data - Champs à mettre à jour (partial UpdateProductInput)
 * @param summary - (optionnel) Résumé humain des changements
 * @param database - Instance Drizzle (par défaut la globale `db`)
 * @returns Le produit mis à jour (état final après UPDATE)
 * @throws ProductError si le produit n'existe pas, mise à jour échoue, ou aucun champ modifiable
 */
export async function updateProduct(
  userId: string,
  id: string,
  data: UpdateProductInput,
  summary?: string,
  database = db
): Promise<Product> {
  // Gestion du slug : priorité à la valeur fournie, sinon génération à partir du nom
  const slug = data.slug ?? (data.name ? slugify(data.name) : undefined)
  if (slug !== undefined) data.slug = slug

  // On ne garde que les champs réellement modifiables (exclut id, createdAt, etc.)
  const setEntries = Object.entries(data).filter(([k]) => !EXCLUDED_KEYS.has(k as any))

  // Cas optimisation : rien à updater → on renvoie l'état actuel sans toucher la DB
  if (setEntries.length === 0) {
    const existing = await database.query.products.findFirst({ where: eq(products.id, id) })
    if (!existing) throw new ProductError('product_not_found' as ProductErrorCode)
    return existing
  }

  // Préparation des clauses SET de manière sécurisée (Drizzle protège contre injection)
  const setClauses = setEntries.map(([k, v]) => sql`${sql.identifier(k)} = ${v}`)

  // UPDATE + RETURNING OLD/NEW en une seule requête (feature Postgres 18)
  // On récupère :
  // - NEW.* → état final du produit
  // - OLD.champ AS old_champ → pour calculer le diff sans SELECT préalable
  const result = await database.execute(sql`
    UPDATE ${products}
    SET ${sql.join(setClauses, sql`, `)}
    WHERE ${products.id} = ${id}
    RETURNING
      ${products}.*,
      ${TRACKED_FIELDS.map((f) => sql`OLD.${sql.identifier(f)} AS old_${f}`).join(', ')}
  `)

  const row = result.rows[0]
  if (!row) throw new ProductError('product_update_failed' as ProductErrorCode)

  // Typage unsafe mais inévitable avec execute() raw → on sait que ça matche Product
  const newProduct = row as Product

  const changes: ProductChanges = {}

  for (const key of TRACKED_FIELDS) {
    const oldKey = `old_${key}` as keyof typeof row
    let oldVal = row[oldKey]

    // Nettoyage important : on force null quand la valeur est vide ou {}
    // → évite que FieldChange reçoive {} alors que le type attend null | primitive | string
    // Sinon Zod ou le typage strict va râler sur '{} | null' vs 'null'
    if (
      oldVal == null ||
      (typeof oldVal === 'object' && oldVal !== null && Object.keys(oldVal).length === 0)
    ) {
      oldVal = null
    }

    const newVal = newProduct[key as keyof Product]

    // areEqual = deepEqual (renommé pour éviter conflit d'import)
    // On compare en profondeur car certains champs peuvent être des objets ou dates
    if (!areEqual(oldVal, newVal)) {
      // Cast FieldChange<any> car :
      // - ProductChanges est un mapped type très précis par clé
      // - Mais ici on construit dynamiquement → TS ne peut pas inférer automatiquement
      // - Le cast est safe car TRACKED_FIELDS correspond exactement à EditableProductKeys
      changes[key as keyof ProductChanges] = {
        old: oldVal,
        new: newVal ?? null,
      } as FieldChange<any>
    }
  }

  // Seulement si au moins un vrai changement → on log dans l'historique
  if (Object.keys(changes).length > 0) {
    // Validation Zod pour s'assurer que le format respecte le schéma attendu
    const parsed = productChangesSchema.parse(changes)

    await database.insert(productEdits).values({
      productId: id,
      editedBy: userId,
      summary: summary ?? null,
      changes: parsed,
    })
  }

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

export type FilterOptions = {
  kinds: string[]
  brands: string[]
  tags: { name: string; slug: string; category: string | null }[]
}

export async function getFilterOptions(database: Database = db): Promise<FilterOptions> {
  const [kindRows, brandRows, tagRows] = await Promise.all([
    database.selectDistinct({ kind: products.kind }).from(products).orderBy(products.kind),
    database.selectDistinct({ brand: products.brand }).from(products).orderBy(products.brand),
    database
      .select({ name: tags.name, slug: tags.slug, category: tags.category })
      .from(tags)
      .orderBy(tags.category, tags.name),
  ])

  return {
    kinds: kindRows.map((r) => r.kind),
    brands: brandRows.map((r) => r.brand),
    tags: tagRows,
  }
}

export async function deleteProduct(id: string, database: Database = db): Promise<void> {
  const rows = await database
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id })
  if (!rows[0]) throw new ProductError('product_delete_failed')
}
