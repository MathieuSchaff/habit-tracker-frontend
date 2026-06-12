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
import { and, count, eq, inArray, or, type SQL, sql } from 'drizzle-orm'

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
import { normalizeInstant, nowISO } from '../../utils/dates'
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

// Fields the caller may never overwrite; silently skipped in updateIngredient.
const IMMUTABLE_KEYS = new Set(['id', 'createdBy', 'createdAt', 'updatedAt'])

// Fields tracked in the audit log. Mirrors `ingredientChangesSchema` in shared/.
const TRACKED_FIELDS = ['name', 'description', 'content', 'type', 'category'] as const

// Tag axes accepted on `/api/ingredients`. Union of every domain's filter
// categories, the same endpoint serves any selected ingredient_type.
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
  // Mirrors products. Never excludes rows.
  const avoidSlugs = filters.avoid_for ? filters.avoid_for.split(',').filter(Boolean) : []

  const [items, [{ total }]] = await Promise.all([
    database
      .select({
        id: ingredients.id,
        name: ingredients.name,
        slug: ingredients.slug,
        type: ingredients.type,
        category: ingredients.category,
        // Truncated to keep the list payload small, full text on detail page.
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

  // noHtml guard: `<` / `>` / `javascript:` in the name crash the seed noHtml check and can leak into rendered INCI lists.
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

  // Non-admins cannot pick a custom slug; derive from name to prevent taxonomy squatting.
  const slug = input.slug && role === 'admin' ? slugify(input.slug) : slugify(input.name)

  try {
    // Reject as a duplicate (409 + existing) if a public ingredient already has this
    // slug. Only public ones count, so a hidden/rejected one never blocks re-submission.
    // This check can be raced by a concurrent insert; the 23505 catch below is the backstop.
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

  // Same noHtml guard as createIngredient.
  if (
    data.name &&
    (data.name.includes('<') || data.name.includes('>') || data.name.includes('javascript:'))
  ) {
    throw new IngredientError('ingredient_update_failed', 'Nom invalide')
  }

  // Skip unchanged fields to avoid spurious UPDATE + audit entries.
  const filteredData: Partial<UpdateIngredientInput> = {}

  for (const key of Object.keys(data) as (keyof UpdateIngredientInput)[]) {
    if (IMMUTABLE_KEYS.has(key)) continue
    if (areEqual(oldIngredient[key as keyof typeof oldIngredient], data[key])) continue
    // Object.assign works around TS losing the index type on dynamic keys.
    Object.assign(filteredData, { [key]: data[key] })
  }

  if (Object.keys(filteredData).length === 0) {
    // Still check OCC so a stale client gets a 409, not a silent no-op.
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
    // RLS-locked) → 409 so the client reloads (the optimistic-lock conflict wins over the 403).
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
// callers to admin/contributor; here we only set the quality stamp. One-way:
// un-verify is out of scope.
export async function verifyIngredient(database: DB, actorId: string, id: string) {
  const [row] = await database
    .update(ingredients)
    .set({
      catalogQuality: 'verified',
      verifiedBy: actorId,
      verifiedAt: nowISO(),
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

// Fuzzy search aligned with `searchProducts`: accent-folded substring fallback
// catches short queries below the trigram floor, with similarity for typos.
export async function searchIngredients(database: DB, query: string, limit = 10) {
  const q = query.trim()
  if (!q) return []
  const escaped = escapeLike(q)
  // Explicit rank: similarity alone over-rewards short contains-matches
  // against long prefix-matches, making the dropdown order feel random.
  const rank = sql`CASE
        WHEN search_norm(${ingredients.name}) = search_norm(${q})
          OR search_norm(${ingredients.slug}) = search_norm(${q}) THEN 0
        WHEN search_norm(${ingredients.name}) LIKE search_norm(${escaped}) || '%' ESCAPE '\\'
          OR search_norm(${ingredients.slug}) LIKE search_norm(${escaped}) || '%' ESCAPE '\\' THEN 1
        WHEN search_norm(${ingredients.name}) LIKE '%' || search_norm(${escaped}) || '%' ESCAPE '\\'
          OR search_norm(${ingredients.slug}) LIKE '%' || search_norm(${escaped}) || '%' ESCAPE '\\' THEN 2
        ELSE 3
      END`
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
        sql`search_norm(${ingredients.name}) LIKE '%' || search_norm(${escaped}) || '%' ESCAPE '\\'`,
        sql`search_norm(${ingredients.slug}) LIKE '%' || search_norm(${escaped}) || '%' ESCAPE '\\'`,
        // % is the indexable form of similarity() > threshold (GIN trgm).
        sql`search_norm(${ingredients.name}) % search_norm(${q})`,
        sql`search_norm(${ingredients.slug}) % search_norm(${q})`
      )
    )
    .orderBy(
      rank,
      sql`GREATEST(
            similarity(search_norm(${ingredients.name}), search_norm(${q})),
            similarity(search_norm(${ingredients.slug}), search_norm(${q}))
          ) DESC`,
      ingredients.name
    )
    .limit(limit)
}

// All tag categories used by any domain, bounds the query so unrelated tag
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
