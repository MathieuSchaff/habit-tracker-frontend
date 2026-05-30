import type {
  AllIngredientTagCategory,
  CreateIngredientInput,
  IngredientFilterOptions,
  IngredientType,
  ListIngredientsSearchFilters,
  UpdateIngredientInput,
} from '@aurore/shared'
import {
  createIngredientSchema,
  DOMAIN_INGREDIENT_FILTER_CATEGORIES,
  updateIngredientSchema,
} from '@aurore/shared'

import slugify from '@sindresorhus/slugify'
import { and, count, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm'

import type { DB } from '../../db/index'
import { ingredientEdits, ingredients } from '../../db/schema/ingredients/ingredients'
import { ingredientTagLinks, ingredientTagTypes } from '../../db/schema/tags/tags'
import {
  assertWithinSubmissionRateLimit,
  type CatalogRole,
  resolveCatalogQuality,
  translateUniqueViolation,
} from '../../lib/catalog'
import { areEqual, escapeLike } from '../../lib/helpers'
import { buildChanges, ingredientEditConfig, logEdit } from '../../lib/logs'
import { normalizeInstant } from '../../utils/dates'
import { IngredientError } from './ingredients-error'

function normalizeIngredient<T extends { createdAt: string; updatedAt: string }>(row: T): T {
  return {
    ...row,
    createdAt: normalizeInstant(row.createdAt),
    updatedAt: normalizeInstant(row.updatedAt),
  }
}

function normalizeEdit<T extends { createdAt: string }>(row: T): T {
  return { ...row, createdAt: normalizeInstant(row.createdAt) }
}

// I put these keys here because we must not let users change them.
// They are reserved for the system, like the ID or the creation date.
const IMMUTABLE_KEYS = new Set(['id', 'createdBy', 'createdAt', 'updatedAt'])

// Fields tracked in the audit log. Mirrors `ingredientChangesSchema` in shared/.
const TRACKED_FIELDS = ['name', 'description', 'content', 'type', 'category'] as const

// Tag axes accepted on `/api/ingredients`. Union of every domain's filter
// categories — the same endpoint serves any selected ingredient_type.
const TAG_AXES = [
  'concern',
  'skin_type',
  'hair_type',
  'age_group',
  'goal',
  'moment',
  'restriction',
  'ingredient_attribute',
  'skin_effect',
  'hair_effect',
  'dental_effect',
  'shared_label',
] as const satisfies readonly (keyof ListIngredientsSearchFilters)[]

export async function listIngredients(database: DB, filters: ListIngredientsSearchFilters) {
  const conditions: SQL[] = []
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const offset = (page - 1) * limit

  // All tag filters share the same sub-query shape: "ingredient has at least
  // one row in ingredient_tags whose tag slug is in this list". AND across
  // axes, OR within an axis.
  const addTagGroup = (slugs: string[]) => {
    if (slugs.length === 0) return
    conditions.push(
      inArray(
        ingredients.id,
        database
          .select({ ingredientId: ingredientTagLinks.ingredientId })
          .from(ingredientTagLinks)
          .innerJoin(
            ingredientTagTypes,
            eq(ingredientTagLinks.ingredientTagId, ingredientTagTypes.id)
          )
          .where(inArray(ingredientTagTypes.slug, slugs))
      )
    )
  }

  for (const axis of TAG_AXES) {
    addTagGroup(filters[axis]?.split(',').filter(Boolean) ?? [])
  }

  const ingredientTypes = filters.ingredient_type?.split(',').filter(Boolean) ?? []
  if (ingredientTypes.length > 0) {
    conditions.push(inArray(ingredients.type, ingredientTypes as IngredientType[]))
  }

  if (filters.quality) {
    conditions.push(eq(ingredients.catalogQuality, filters.quality))
  }
  if (filters.status) {
    conditions.push(eq(ingredients.moderationStatus, filters.status))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const orderBy = filters.sort === 'random' ? sql`random()` : ingredients.name

  // avoid_for is computed post-fetch as per-ingredient profileMatches (badge UX)
  // — mirrors products. Never excludes rows.
  const avoidSlugs = filters.avoid_for ? filters.avoid_for.split(',').filter(Boolean) : []

  const [items, [{ total }]] = await Promise.all([
    database
      .select({
        id: ingredients.id,
        name: ingredients.name,
        slug: ingredients.slug,
        type: ingredients.type,
        category: ingredients.category,
        // Truncated to keep the list payload small — full text on detail page.
        description: sql<string | null>`left(${ingredients.description}, 120)`,
      })
      .from(ingredients)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    database
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(ingredients)
      .where(where),
  ])

  const matchesByIngredient = new Map<string, string[]>()
  if (items.length > 0 && avoidSlugs.length > 0) {
    const itemIds = items.map((i) => i.id)
    const avoidRows = await database
      .select({ ingredientId: ingredientTagLinks.ingredientId, slug: ingredientTagTypes.slug })
      .from(ingredientTagLinks)
      .innerJoin(ingredientTagTypes, eq(ingredientTagLinks.ingredientTagId, ingredientTagTypes.id))
      .where(
        and(
          inArray(ingredientTagLinks.ingredientId, itemIds),
          inArray(ingredientTagTypes.slug, avoidSlugs),
          eq(ingredientTagLinks.relevance, 'avoid')
        )
      )
    for (const row of avoidRows) {
      const list = matchesByIngredient.get(row.ingredientId) ?? []
      list.push(row.slug)
      matchesByIngredient.set(row.ingredientId, list)
    }
  }

  const itemsWithMatches = items.map((i) => ({
    ...i,
    profileMatches: matchesByIngredient.get(i.id) ?? [],
  }))

  return { items: itemsWithMatches, total }
}

export async function createIngredient(
  database: DB,
  userId: string,
  role: CatalogRole,
  input: CreateIngredientInput
) {
  createIngredientSchema.parse(input)

  // I check if there are weird symbols like "<" to be sure no one puts bad code in the name.
  if (input.name.includes('<') || input.name.includes('>') || input.name.includes('javascript:')) {
    throw new IngredientError('ingredient_creation_failed', 'Nom invalide')
  }

  await assertWithinSubmissionRateLimit(
    database,
    'count_recent_ingredient_submissions',
    userId,
    role,
    () => new IngredientError('ingredient_rate_limited')
  )

  // Only admins can choose their own slug. For others, I derive it from the name.
  const slug = input.slug && role === 'admin' ? slugify(input.slug) : slugify(input.name)

  try {
    // Tier-1 dedup (A-2): surface an existing VISIBLE ingredient with the same
    // slug (409 + existing). Scoped to visible so a hidden tombstone never
    // blocks a re-submission (V-3) nor leaks; tier-2 below guards races.
    const [existing] = await database
      .select({ id: ingredients.id, slug: ingredients.slug, name: ingredients.name })
      .from(ingredients)
      .where(and(eq(ingredients.slug, slug), eq(ingredients.moderationStatus, 'visible')))
      .limit(1)
    if (existing) throw new IngredientError('ingredient_already_exists', existing)

    const [ingredient] = await database
      .insert(ingredients)
      .values({
        ...input,
        createdBy: userId,
        slug,
        ...resolveCatalogQuality(role, userId),
      })
      .returning()

    if (!ingredient) throw new IngredientError('ingredient_creation_failed')

    return normalizeIngredient(ingredient)
  } catch (e) {
    if (e instanceof IngredientError) throw e
    translateUniqueViolation(e, () => new IngredientError('ingredient_already_exists'))
  }
}

export async function getIngredientById(database: DB, id: string) {
  const [ingredient] = await database
    .select()
    .from(ingredients)
    .where(eq(ingredients.id, id))
    .limit(1)

  if (!ingredient) throw new IngredientError('ingredient_not_found')
  return normalizeIngredient(ingredient)
}

export async function getIngredientBySlug(database: DB, slug: string) {
  const [ingredient] = await database
    .select()
    .from(ingredients)
    .where(eq(ingredients.slug, slug))
    .limit(1)

  if (!ingredient) throw new IngredientError('ingredient_not_found')
  return normalizeIngredient(ingredient)
}

export async function updateIngredient(
  database: DB,
  userId: string,
  id: string,
  data: UpdateIngredientInput,
  summary?: string,
  expectedUpdatedAt?: string
) {
  updateIngredientSchema.parse(data)

  const oldIngredient = await getIngredientById(database, id)

  // Again, I check for bad characters in the name to be safe.
  if (
    data.name &&
    (data.name.includes('<') || data.name.includes('>') || data.name.includes('javascript:'))
  ) {
    throw new IngredientError('ingredient_update_failed', 'Nom invalide')
  }

  // I only keep the fields that are really different from what we have in the database.
  const filteredData: Partial<UpdateIngredientInput> = {}

  for (const key of Object.keys(data) as (keyof UpdateIngredientInput)[]) {
    if (IMMUTABLE_KEYS.has(key)) continue
    if (areEqual(oldIngredient[key as keyof typeof oldIngredient], data[key])) continue
    // TS is a bit lost here with dynamic keys, so I use Object.assign to help it.
    Object.assign(filteredData, { [key]: data[key] })
  }

  // If after the check nothing changed, I just return the old ingredient.
  if (Object.keys(filteredData).length === 0) {
    // I also check if the updatedAt matches to be sure no one else changed it while I was working.
    if (expectedUpdatedAt && oldIngredient.updatedAt !== expectedUpdatedAt) {
      throw new IngredientError('ingredient_update_conflict')
    }
    return oldIngredient // already normalized via getIngredientById
  }

  const whereConditions = [eq(ingredients.id, id)]
  if (expectedUpdatedAt) {
    whereConditions.push(eq(ingredients.updatedAt, expectedUpdatedAt))
  }

  const [newIngredient] = await database
    .update(ingredients)
    .set(filteredData)
    .where(and(...whereConditions))
    .returning()

  if (!newIngredient) {
    // 0-row UPDATE. With an optimistic lock set, the row moved under us (or is now
    // RLS-locked) → 409 so the client reloads (CQ-2: OCC stays ahead of the 403).
    // Otherwise getIngredientById above already proved the row is visible, so a
    // 0-row update means it exists but the caller may not edit it (now verified or
    // not theirs) → 403. Never read rowCount (bun-postgres footgun). slug is
    // immutable and moderation_status isn't patchable here, so no 23505 is reachable.
    if (expectedUpdatedAt) throw new IngredientError('ingredient_update_conflict')
    throw new IngredientError('unauthorized_access')
  }

  const changes = buildChanges(oldIngredient, newIngredient, TRACKED_FIELDS)

  await logEdit(database, ingredientEditConfig, {
    entityId: id,
    editedBy: userId,
    summary: summary ?? null,
    changes,
  })

  return normalizeIngredient(newIngredient)
}

// Stamp an ingredient as verified. Route guard (requireCatalogWrite) limits
// callers to admin/contributor; here we only set the quality stamp. One-way —
// un-verify is out of scope.
export async function verifyIngredient(database: DB, actorId: string, id: string) {
  const [row] = await database
    .update(ingredients)
    .set({
      catalogQuality: 'verified',
      verifiedBy: actorId,
      verifiedAt: new Date().toISOString(),
    })
    .where(and(eq(ingredients.id, id), eq(ingredients.moderationStatus, 'visible')))
    .returning()
  if (!row) throw new IngredientError('ingredient_not_found')
  return normalizeIngredient(row)
}

export async function deleteIngredient(
  database: DB,
  role: 'user' | 'admin' | 'contributor',
  id: string
) {
  if (role !== 'admin') throw new IngredientError('unauthorized_access')

  const rows = await database
    .delete(ingredients)
    .where(eq(ingredients.id, id))
    .returning({ id: ingredients.id })

  if (!rows[0]) throw new IngredientError('ingredient_delete_failed')
}

export async function listIngredientEdits(database: DB, ingredientId: string) {
  const rows = await database
    .select()
    .from(ingredientEdits)
    .where(eq(ingredientEdits.ingredientId, ingredientId))
    .orderBy(sql`${ingredientEdits.createdAt} DESC`)
  return rows.map(normalizeEdit)
}

// Fuzzy search aligned with `searchProducts` — pg_trgm `similarity()` plus
// ILIKE substring fallback (catches short queries below the trigram floor),
// ordered by best similarity. Trigram GIN on name/slug feeds both branches.
export async function searchIngredients(database: DB, query: string, limit = 10) {
  const q = query.trim()
  if (!q) return []
  const pattern = `%${escapeLike(q)}%`
  return database
    .select({
      id: ingredients.id,
      name: ingredients.name,
      slug: ingredients.slug,
      type: ingredients.type,
      category: ingredients.category,
    })
    .from(ingredients)
    .where(
      or(
        ilike(ingredients.name, pattern),
        ilike(ingredients.slug, pattern),
        sql`similarity(lower(${ingredients.name}), lower(${q})) > 0.3`,
        sql`similarity(lower(${ingredients.slug}), lower(${q})) > 0.3`
      )
    )
    .orderBy(
      sql`GREATEST(
            similarity(lower(${ingredients.name}), lower(${q})),
            similarity(lower(${ingredients.slug}), lower(${q}))
          ) DESC`,
      ingredients.name
    )
    .limit(limit)
}

// All tag categories used by any domain — bounds the query so unrelated tag
// types (if ever introduced) don't leak into the drawer.
const ALL_FILTER_CATEGORIES = Array.from(
  new Set(Object.values(DOMAIN_INGREDIENT_FILTER_CATEGORIES).flat())
) as AllIngredientTagCategory[]

export async function getIngredientFilterOptions(
  database: DB,
  domain?: IngredientType
): Promise<IngredientFilterOptions> {
  const ingredientScope = domain ? eq(ingredients.type, domain) : undefined

  const rows = await database
    .select({
      slug: ingredientTagTypes.slug,
      name: ingredientTagTypes.label,
      category: ingredientTagTypes.tagType,
      count: count(ingredientTagLinks.ingredientId),
    })
    .from(ingredientTagTypes)
    .innerJoin(ingredientTagLinks, eq(ingredientTagTypes.id, ingredientTagLinks.ingredientTagId))
    .innerJoin(ingredients, eq(ingredientTagLinks.ingredientId, ingredients.id))
    .where(
      ingredientScope
        ? and(inArray(ingredientTagTypes.tagType, ALL_FILTER_CATEGORIES), ingredientScope)
        : inArray(ingredientTagTypes.tagType, ALL_FILTER_CATEGORIES)
    )
    .groupBy(
      ingredientTagTypes.id,
      ingredientTagTypes.slug,
      ingredientTagTypes.label,
      ingredientTagTypes.tagType
    )
    .orderBy(ingredientTagTypes.tagType, ingredientTagTypes.label)

  const tags = rows
    .filter((r): r is typeof r & { category: AllIngredientTagCategory } => r.category !== null)
    .map((r) => ({ slug: r.slug, name: r.name, category: r.category, count: r.count }))

  return { tags }
}

// This list is very light, I use it just to fill the small select boxes.
export async function listAllIngredientOptions(database: DB) {
  return database
    .select({
      id: ingredients.id,
      name: ingredients.name,
      slug: ingredients.slug,
    })
    .from(ingredients)
    .orderBy(ingredients.name)
}

// Batch lookup used by the async ingredient filter to resolve `name` for
// chips deep-linked from the URL (a slug list with no labels in cache).
export async function listIngredientsBySlugs(database: DB, slugs: string[]) {
  if (slugs.length === 0) return []
  return database
    .select({ slug: ingredients.slug, name: ingredients.name })
    .from(ingredients)
    .where(inArray(ingredients.slug, slugs))
}
