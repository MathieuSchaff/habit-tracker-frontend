import type {
  CreateProductInput,
  ListProductsFilters,
  ProductKind,
  ProductSearchPage,
  ProductSearchResult,
  ProductUnit,
  UpdateProductInput,
  UserProductStatus,
} from '@aurore/shared'
import {
  DENTAL_PRODUCT_TAG_CATEGORIES,
  HAIRCARE_PRODUCT_TAG_CATEGORIES,
  PRODUCT_DOMAIN_DB_CATEGORIES,
  type ProductDomainTab,
  resolveAvoidSlugs,
  SKINCARE_PRODUCT_TAG_CATEGORIES,
  SUPPLEMENT_PRODUCT_TAG_CATEGORIES,
} from '@aurore/shared'

import slugify from '@sindresorhus/slugify'
import {
  and,
  asc,
  count,
  eq,
  exists,
  gte,
  inArray,
  lte,
  notExists,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'

import { db } from '../../db'
import type { Database, DB } from '../../db/index'
import { ingredients, productIngredients } from '../../db/schema'
import { type Product, products } from '../../db/schema/products'
import { userProducts } from '../../db/schema/products/user-products'
import { productTagLinks, productTagTypes } from '../../db/schema/tags/tags'
import {
  assertWithinSubmissionRateLimit,
  type CatalogRole,
  resolveCatalogQuality,
  translateUniqueViolation,
} from '../../lib/catalog'
import { escapeLike } from '../../lib/helpers'
import { buildChanges, logEdit, productEditConfig } from '../../lib/logs'
import { normalizeInci } from '../../lib/normalize-inci'
import { nowISO } from '../../utils/dates'
import { type OrchestratorProductFields, writeTagsForProductFailSoft } from '../auto-tagging'
import { listTagsByProduct } from '../product-tags/service'
import { ProductError } from './product-error'
import { listIngredientsByProduct } from './product-ingredients/product-ingredients.service'

// Trim + collapse internal whitespace so create and update write identical normalized values.
const normalizeString = (s: string) => s.trim().replace(/\s+/g, ' ')

const NORMALIZED_STRING_FIELDS = ['name', 'brand', 'kind', 'unit', 'amountUnit'] as const

const PRODUCT_TAG_CATEGORIES_BY_DOMAIN = {
  skincare: SKINCARE_PRODUCT_TAG_CATEGORIES,
  haircare: HAIRCARE_PRODUCT_TAG_CATEGORIES,
  dental: DENTAL_PRODUCT_TAG_CATEGORIES,
  complement: SUPPLEMENT_PRODUCT_TAG_CATEGORIES,
} as const

export async function createProduct(
  userId: string,
  role: CatalogRole,
  input: CreateProductInput,
  database: DB = db,
  options: { autoTag?: boolean } = {}
) {
  try {
    await assertWithinSubmissionRateLimit(
      database,
      'count_recent_product_submissions',
      userId,
      role,
      () => new ProductError('product_rate_limited')
    )

    const name = normalizeString(input.name)
    const brand = normalizeString(input.brand)

    // Reject as a duplicate if a public product already has the same name + brand
    // (compared via norm(), the same normalization the DB unique index uses). Only
    // public products count, so a hidden/rejected one never blocks re-submission.
    // This check can be raced by a concurrent insert; the 23505 catch below is the backstop.
    const [existing] = await database
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        brand: products.brand,
        kind: products.kind,
      })
      .from(products)
      .where(
        and(
          eq(products.moderationStatus, 'visible'),
          sql`norm(${products.name}) = norm(${name})`,
          sql`norm(${products.brand}) = norm(${brand})`
        )
      )
      .limit(1)
    if (existing) throw new ProductError('product_already_exists', existing)

    const slug = input.slug ?? `${name}${brand ? `-${brand}` : ''}`
    const [product] = await database
      .insert(products)
      .values({
        ...input,
        createdBy: userId,
        name,
        brand,
        inci: input.inci != null ? normalizeInci(input.inci).value : input.inci,
        kind: normalizeString(input.kind) as ProductKind,
        unit: normalizeString(input.unit) as ProductUnit,
        amountUnit: input.amountUnit ? normalizeString(input.amountUnit) : input.amountUnit,
        slug: slugify(slug),
        ...resolveCatalogQuality(role, userId),
      })
      .returning()

    if (!product) throw new ProductError('product_creation_failed')

    // Seed passes autoTag:false: it runs a dedicated phase after ingredients are
    // linked, so tagging here would see no ingredients and PK-collide with the seed phase.
    if (options.autoTag ?? true) {
      await writeTagsForProductFailSoft(database, product.id, { operation: 'create', userId })
    }

    return product
  } catch (e) {
    if (e instanceof ProductError) throw e
    translateUniqueViolation(e, () => new ProductError('product_already_exists'))
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
      texture: products.texture,
      notes: products.notes,
      catalogQuality: products.catalogQuality,
      moderationStatus: products.moderationStatus,
      createdBy: products.createdBy,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
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

// Single round-trip so Layout/Info/Edit/Sheet share one cache entry.
export async function getProductFullBySlug(slug: string, database: Database = db) {
  const product = await getProductBySlug(slug, database)
  const [ingredients, tags] = await Promise.all([
    listIngredientsByProduct(database, product.id),
    listTagsByProduct(database, product.id),
  ])
  return {
    ...product,
    ingredients,
    tags,
  }
}

// id/createdBy/createdAt are immutable; quality/moderation/verify stamps are admin-governed.
const EXCLUDED_KEYS = new Set([
  'id',
  'createdBy',
  'createdAt',
  'catalogQuality',
  'moderationStatus',
  'verifiedBy',
  'verifiedAt',
])

const TRACKED_FIELDS = [
  'name',
  'brand',
  'category',
  'kind',
  'texture',
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

// Any change to these can shift the detected tag set.
const AUTOTAG_INPUT_FIELDS = [
  'inci',
  'kind',
  'category',
  'brand',
  'texture',
  'name',
  'description',
] as const satisfies readonly Extract<
  (typeof TRACKED_FIELDS)[number],
  keyof OrchestratorProductFields
>[]

// A field added to OrchestratorProductFields but missing above would silently
// stop re-tagging on edits to that column.
type MissingAutotagInputField = Exclude<
  keyof OrchestratorProductFields,
  (typeof AUTOTAG_INPUT_FIELDS)[number]
>
const _autotagInputFieldsCoverOrchestratorInput: [MissingAutotagInputField] extends [never]
  ? true
  : MissingAutotagInputField = true

function isColumnLike(obj: unknown): obj is { name: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as Record<string, unknown>).name === 'string'
  )
}

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

  // Canonicalize the INCI list on edit so it stays consistent with create.
  // Skip null (clearing the field) and empty strings.
  if (typeof data.inci === 'string' && data.inci.trim().length > 0) {
    data.inci = normalizeInci(data.inci).value
  }

  // Slug is not regenerated from name: silent changes break bookmarks, SEO, and CDN image filenames.
  // Caller must pass slug explicitly to rename.
  if (data.slug !== undefined) data.slug = slugify(data.slug)

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

  // Raw SQL to return both new values and old values in one round-trip for the edit log.
  let result: Record<string, unknown>[]
  try {
    result = (await database.execute(sql`
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
    `)) as Record<string, unknown>[]
  } catch (e) {
    if (e instanceof ProductError) throw e
    // Name/brand rename can collide with the partial unique index on visible rows.
    // Re-throw so withRlsContext rolls back; a swallowed 23505 surfaces as 500.
    translateUniqueViolation(e, () => new ProductError('product_already_exists'))
  }

  const row = result[0] as Record<string, unknown> | undefined
  if (!row) {
    // UPDATE matched 0 rows. Under RLS the row may be locked/not owned/invisible.
    // Disambiguate: 403 if visible (caller can't edit it), 404 if absent.
    // Never read rowCount (bun-postgres footgun).
    const [visible] = await database
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1)
    throw new ProductError(visible ? 'unauthorized_access' : 'product_not_found')
  }

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

  if (AUTOTAG_INPUT_FIELDS.some((f) => changes[f] !== undefined)) {
    await writeTagsForProductFailSoft(database, id, { operation: 'update', userId })
  }

  return newProduct as Product
}

// One-way: un-verify is out of scope.
export async function verifyProduct(
  actorId: string,
  id: string,
  database: DB = db
): Promise<Product> {
  const [row] = await database
    .update(products)
    .set({
      catalogQuality: 'verified',
      verifiedBy: actorId,
      verifiedAt: nowISO(),
    })
    .where(and(eq(products.id, id), eq(products.moderationStatus, 'visible')))
    .returning()
  if (!row) throw new ProductError('product_not_found')
  return row
}

type ProductSummary = Pick<
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
  // Avoid-tag slugs matching the caller's profile. Empty when no profile filter is active.
  profileMatches: string[]
  // Primary tags only. The card's chips + its "+N" overflow count both key on
  // relevance='primary'; secondary (~15/product) was pure list over-fetch.
  tags: { slug: string; tagType: string; relevance: 'primary' | 'secondary' }[]
  // null when anonymous or unshelved.
  userStatus: UserProductStatus | null
}
export type ProductsPage = {
  items: ProductSummary[]
  total: number
  page: number
  limit: number
}

// Shared by the autocomplete (`searchProducts`) and the list (`?q=`) so
// "Voir tous les résultats" recalls and ranks exactly like the dropdown.
function productSearchMatch(q: string) {
  const escaped = escapeLike(q)
  return {
    condition: or(
      sql`search_norm(${products.name}) LIKE '%' || search_norm(${escaped}) || '%' ESCAPE '\\'`,
      sql`search_norm(${products.brand}) LIKE '%' || search_norm(${escaped}) || '%' ESCAPE '\\'`,
      // % is the indexable form of similarity() > threshold (GIN trgm).
      sql`search_norm(${products.name}) % search_norm(${q})`,
      sql`search_norm(${products.brand}) % search_norm(${q})`
    ) as SQL,
    // Explicit rank: similarity alone over-rewards short contains-matches
    // against long prefix-matches, making the order feel random.
    rank: sql`CASE
        WHEN search_norm(${products.name}) = search_norm(${q})
          OR search_norm(${products.brand}) = search_norm(${q}) THEN 0
        WHEN search_norm(${products.name}) LIKE search_norm(${escaped}) || '%' ESCAPE '\\'
          OR search_norm(${products.brand}) LIKE search_norm(${escaped}) || '%' ESCAPE '\\' THEN 1
        WHEN search_norm(${products.name}) LIKE '%' || search_norm(${escaped}) || '%' ESCAPE '\\'
          OR search_norm(${products.brand}) LIKE '%' || search_norm(${escaped}) || '%' ESCAPE '\\' THEN 2
        ELSE 3
      END`,
    similarityDesc: sql`GREATEST(
        similarity(search_norm(${products.name}), search_norm(${q})),
        similarity(search_norm(${products.brand}), search_norm(${q}))
      ) DESC`,
  }
}

// Flat additive filter dispatch. Cyclomatic == number of optional filters; splitting relocates
// the count without improving clarity. Behaviour covered by listProducts filter tests.
function buildListConditions(filters: ListProductsFilters, database: Database): SQL[] {
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

  // EXISTS short-circuits on first match per product via product_ingredients_product_idx.
  // IN (SELECT ...) previously materialized the full set upfront.
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
        .from(productTagLinks)
        .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
        .where(
          and(
            eq(productTagLinks.productId, products.id),
            inArray(productTagTypes.slug, raw.split(',')),
            eq(productTagTypes.tagType, tagType)
          )
        )
    )

  // matin/soir also match products with no moment tag (universals, usable any moment).
  // Restrictive moments (hebdomadaire, usage-localise, crise) keep strict EXISTS.
  const ROUTINE_MOMENT_UNIVERSAL = new Set(['moment-matin', 'moment-soir'])
  const routineMomentFilterCondition = (raw: string): SQL => {
    const slugs = raw.split(',').map((s) => s.trim())
    const includesUniversal = slugs.some((s) => ROUTINE_MOMENT_UNIVERSAL.has(s))
    const strict = tagFilterCondition(raw, 'routine_moment')
    if (!includesUniversal) return strict
    const noMomentTag = notExists(
      database
        .select({ one: sql`1` })
        .from(productTagLinks)
        .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
        .where(
          and(
            eq(productTagLinks.productId, products.id),
            eq(productTagTypes.tagType, 'routine_moment')
          )
        )
    )
    return or(strict, noMomentTag) as SQL
  }

  // filters is a discriminated union on category; the merged tagType spans all domains, so the
  // parallel lookup defeats narrowing. Tag fields are all string | undefined, so the cast is sound.
  // routine_moment only exists in the skincare tuple; the special-case is a no-op elsewhere.
  const tagFilters = filters as unknown as Record<string, string | undefined>
  for (const tagType of PRODUCT_TAG_CATEGORIES_BY_DOMAIN[filters.category]) {
    const value = tagFilters[tagType]
    if (!value) continue
    if (tagType === 'routine_moment') {
      conditions.push(routineMomentFilterCondition(value))
      continue
    }
    conditions.push(tagFilterCondition(value, tagType))
  }

  if (filters.priceMin !== undefined) {
    conditions.push(gte(products.priceCents, filters.priceMin))
  }
  if (filters.priceMax !== undefined) {
    conditions.push(lte(products.priceCents, filters.priceMax))
  }

  if (filters.q) {
    conditions.push(productSearchMatch(filters.q).condition)
  }

  if (filters.quality) {
    conditions.push(eq(products.catalogQuality, filters.quality))
  }
  if (filters.status) {
    conditions.push(eq(products.moderationStatus, filters.status))
  }

  return conditions
}
type ProductMeta = {
  matchesByProduct: Map<string, string[]>
  tagsByProduct: Map<string, ProductSummary['tags']>
  statusByProduct: Map<string, UserProductStatus>
}

// The explicit user_id filter is load-bearing, not test-safety: RLS is active (withRlsContext) but the
// additive user_products_select_for_public_review policy widens SELECT to other users' public-review rows,
// so the filter scopes the read back to the caller. Shared by the list meta and the /shelf-status overlay.
export async function getShelfStatusByProductIds(
  database: Database,
  userId: string,
  productIds: string[]
): Promise<{ productId: string; status: UserProductStatus }[]> {
  if (productIds.length === 0) return []
  return database
    .select({ productId: userProducts.productId, status: userProducts.status })
    .from(userProducts)
    .where(and(eq(userProducts.userId, userId), inArray(userProducts.productId, productIds)))
}

async function fetchProductMeta(
  items: { id: string }[],
  filters: ListProductsFilters,
  userId: string | null,
  database: Database
): Promise<ProductMeta> {
  const matchesByProduct = new Map<string, string[]>()
  const tagsByProduct = new Map<string, ProductSummary['tags']>()
  const statusByProduct = new Map<string, UserProductStatus>()

  if (items.length === 0) {
    return { matchesByProduct, tagsByProduct, statusByProduct }
  }

  // Post-fetch badge UX: flag rows rather than exclude them. resolveAvoidSlugs maps
  // user concern vocab to product tag slugs; without it ~70% of avoid badges are invisible.
  const avoidSlugs = filters.avoid_for
    ? resolveAvoidSlugs(filters.avoid_for.split(',').filter(Boolean))
    : []

  const itemIds = items.map((i) => i.id)

  const [avoidRows, positiveTagRows, shelfRows] = await Promise.all([
    avoidSlugs.length > 0
      ? database
          .select({ productId: productTagLinks.productId, slug: productTagTypes.slug })
          .from(productTagLinks)
          .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
          .where(
            and(
              inArray(productTagLinks.productId, itemIds),
              inArray(productTagTypes.slug, avoidSlugs),
              eq(productTagLinks.relevance, 'avoid')
            )
          )
      : Promise.resolve([] as { productId: string; slug: string }[]),
    // Primary tags only: the card renders relevance='primary' chips; secondary (~15/product)
    // was list over-fetch, avoid already lives in profileMatches.
    database
      .select({
        productId: productTagLinks.productId,
        slug: productTagTypes.slug,
        tagType: productTagTypes.tagType,
        relevance: productTagLinks.relevance,
      })
      .from(productTagLinks)
      .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
      .where(
        and(inArray(productTagLinks.productId, itemIds), eq(productTagLinks.relevance, 'primary'))
      ),
    userId
      ? getShelfStatusByProductIds(database, userId, itemIds)
      : Promise.resolve([] as { productId: string; status: UserProductStatus }[]),
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

  for (const row of shelfRows) {
    statusByProduct.set(row.productId, row.status)
  }

  return { matchesByProduct, tagsByProduct, statusByProduct }
}

export async function listProducts(
  filters: ListProductsFilters,
  database: Database = db,
  userId: string | null = null
): Promise<ProductsPage> {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const offset = (page - 1) * limit

  const conditions = buildListConditions(filters, database)
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const orderBy = (() => {
    switch (filters.sort) {
      case 'random':
        return [sql`random()`]
      case 'price_asc':
        return [sql`${products.priceCents} ASC NULLS LAST`]
      case 'price_desc':
        return [sql`${products.priceCents} DESC NULLS LAST`]
      case 'newest':
        return [sql`${products.createdAt} DESC NULLS LAST`]
      case 'name':
        return [products.name]
      // relevance (and unset sort): rank by match when q is present, else name.
      default: {
        if (!filters.q) return [products.name]
        const match = productSearchMatch(filters.q)
        return [match.rank, match.similarityDesc, products.name]
      }
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
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    database.select({ total: count() }).from(products).where(where),
  ])

  const total = countResult[0]?.total ?? 0

  const { matchesByProduct, tagsByProduct, statusByProduct } = await fetchProductMeta(
    items,
    filters,
    userId,
    database
  )

  const itemsWithMatches: ProductSummary[] = items.map((i) => ({
    ...i,
    profileMatches: matchesByProduct.get(i.id) ?? [],
    tags: tagsByProduct.get(i.id) ?? [],
    userStatus: statusByProduct.get(i.id) ?? null,
  }))

  return { items: itemsWithMatches, total, page, limit }
}
export type FilterOptions = {
  kinds: string[]
  brands: string[]
  // Only slugs with >=1 product are present. Frontend reads missing slug as count 0 (disabled chip).
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
        slug: productTagTypes.slug,
        count: count(productTagLinks.productId),
      })
      .from(productTagTypes)
      .innerJoin(productTagLinks, eq(productTagTypes.id, productTagLinks.productTagId))
      .innerJoin(products, eq(productTagLinks.productId, products.id))
      .where(productScope)
      .groupBy(productTagTypes.id, productTagTypes.slug),
  ])

  const tagCounts: Record<string, number> = {}
  for (const r of tagRows) tagCounts[r.slug] = r.count

  return {
    kinds: kindRows.map((r) => r.kind),
    brands: brandRows.map((r) => r.brand),
    tagCounts,
  }
}
export async function getDistinctBrands(
  database: Database = db,
  category?: ProductDomainTab
): Promise<string[]> {
  const rows = await database
    .selectDistinct({ brand: products.brand })
    .from(products)
    .where(
      category ? inArray(products.category, [...PRODUCT_DOMAIN_DB_CATEGORIES[category]]) : undefined
    )
    .orderBy(asc(products.brand))
  return rows.map((r) => r.brand)
}

export async function deleteProduct(
  database: Database,
  role: 'user' | 'admin' | 'contributor',
  id: string
): Promise<void> {
  if (role !== 'admin') throw new ProductError('unauthorized_access')

  const product = await database.query.products.findFirst({ where: eq(products.id, id) })
  if (!product) throw new ProductError('product_not_found')

  await database.delete(products).where(eq(products.id, id))
}

export async function findSimilarProducts(
  name: string,
  brand: string,
  database: Database = db
): Promise<ProductSearchResult[]> {
  const trimmedName = name.trim()
  const trimmedBrand = brand.trim()
  if (!trimmedName || !trimmedBrand) return []
  const escapedName = escapeLike(trimmedName)

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
          sql`search_norm(${products.brand}) = search_norm(${trimmedBrand})`,
          // % pre-filter makes the branch indexable; 0.5 stays the real cutoff.
          sql`(search_norm(${products.brand}) % search_norm(${trimmedBrand})
            AND similarity(search_norm(${products.brand}), search_norm(${trimmedBrand})) > 0.5)`
        ),
        or(
          // % is the indexable form of similarity() > threshold (GIN trgm).
          sql`search_norm(${products.name}) % search_norm(${trimmedName})`,
          sql`search_norm(${products.name}) LIKE '%' || search_norm(${escapedName}) || '%' ESCAPE '\\'`
        )
      )
    )
    .limit(5)
    .orderBy(
      sql`similarity(search_norm(${products.name}), search_norm(${trimmedName})) DESC`,
      products.name
    )
}

export async function getProductsByIds(
  ids: string[],
  database: Database = db
): Promise<{ id: string; name: string; brand: string }[]> {
  if (ids.length === 0) return []
  return database
    .select({ id: products.id, name: products.name, brand: products.brand })
    .from(products)
    .where(inArray(products.id, ids))
}

export async function searchProducts(
  filters: { q: string; limit?: number; offset?: number; category?: ProductDomainTab },
  database: Database = db
): Promise<ProductSearchPage> {
  const limit = filters.limit ?? 8
  const offset = filters.offset ?? 0
  const match = productSearchMatch(filters.q.trim())
  // Same domain scoping as listProducts: the dropdown must agree with the
  // "Voir tous les résultats" page it links to.
  const where = filters.category
    ? and(
        match.condition,
        inArray(products.category, [...PRODUCT_DOMAIN_DB_CATEGORIES[filters.category]])
      )
    : match.condition
  const rows = await database
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      kind: products.kind,
      slug: products.slug,
    })
    .from(products)
    .where(where)
    .limit(limit + 1)
    .offset(offset)
    .orderBy(match.rank, match.similarityDesc, products.name)
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  return { items, hasMore, nextOffset: offset + limit }
}

export async function previewSlug(name: string, brand: string, database: DB = db): Promise<string> {
  const normalizedName = normalizeString(name)
  const normalizedBrand = normalizeString(brand)
  const raw = `${normalizedName}${normalizedBrand ? `-${normalizedBrand}` : ''}`
  const baseSlug = slugify(raw)

  // Non-alphanumeric names (e.g. '!!') pass Zod min(2) but produce an empty slug.
  // Return a fallback so the caller never enters an infinite DB loop on slug=''.
  if (!baseSlug) return 'product'

  let candidate = baseSlug
  let attempt = 1
  while (attempt <= 100) {
    const [existing] = await database
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, candidate))
      .limit(1)
    if (!existing) return candidate
    candidate = `${baseSlug}-${attempt}`
    attempt++
  }
  return `${baseSlug}-${Date.now()}`
}
