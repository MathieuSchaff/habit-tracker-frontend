import type {
  CreateIngredientInput,
  FieldChange,
  IngredientChanges,
  IngredientSearchFilters,
  UpdateIngredientInput,
} from '@habit-tracker/shared'
import {
  createIngredientSchema,
  type IngredientTagCategory,
  ingredientChangesSchema,
  ingredientFilterCategories,
  updateIngredientSchema,
} from '@habit-tracker/shared'

import slugify from '@sindresorhus/slugify'
import { and, eq, ilike, inArray, ne, or, type SQL, sql } from 'drizzle-orm'

import type { DB } from '../../db/index'
import { ingredientEdits, ingredients } from '../../db/schema/ingredients/ingredients'
import { ingredientTagsDefs, tagIngredients } from '../../db/schema/tags/tags'
import { areEqual, isUniqueViolation } from '../../lib/helpers'
import { getFullUserById } from '../auth/user.utils'
import { IngredientError } from './ingredients-error'

// I put these keys here because we must not let users change them.
// They are reserved for the system, like the ID or the creation date.
const IMMUTABLE_KEYS = new Set(['id', 'createdBy', 'createdAt', 'updatedAt'])

// I don't want to track these ones in the history log because they are not useful or
// they change automatically, like the slug.
const AUDIT_EXCLUDED_KEYS = new Set(['id', 'createdBy', 'createdAt', 'slug', 'updatedAt'])

export async function listIngredients(database: DB, filters: IngredientSearchFilters) {
  const conditions: SQL[] = []
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const offset = (page - 1) * limit

  // Filters arrive as comma-joined strings from the query params.
  const concerns = filters.concern?.split(',').filter(Boolean) ?? []
  const skinTypes = filters.skin_type?.split(',').filter(Boolean) ?? []
  const ingredientAttributes = filters.ingredient_attribute?.split(',').filter(Boolean) ?? []
  const skinEffects = filters.skin_effect?.split(',').filter(Boolean) ?? []
  const sharedLabels = filters.shared_label?.split(',').filter(Boolean) ?? []

  // All tag filters share the same sub-query shape: "ingredient has at
  // least one row in ingredient_tags whose tag slug is in this list".
  // AND between groups, OR within a group.
  const addTagGroup = (slugs: string[]) => {
    if (slugs.length === 0) return
    conditions.push(
      inArray(
        ingredients.id,
        database
          .select({ ingredientId: tagIngredients.ingredientId })
          .from(tagIngredients)
          .innerJoin(ingredientTagsDefs, eq(tagIngredients.ingredientTagId, ingredientTagsDefs.id))
          .where(inArray(ingredientTagsDefs.slug, slugs))
      )
    )
  }

  addTagGroup(concerns)
  addTagGroup(skinTypes)
  addTagGroup(ingredientAttributes)
  addTagGroup(skinEffects)
  addTagGroup(sharedLabels)

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const orderBy = filters.sort === 'random' ? sql`random()` : ingredients.name

  // I run both requests at the same time with Promise.all to go faster.
  // One for the data, and one to count how many ingredients we have in total.
  const [items, [{ total }]] = await Promise.all([
    database
      .select({
        id: ingredients.id,
        name: ingredients.name,
        slug: ingredients.slug,
        type: ingredients.type,
        category: ingredients.category,
        // I only take the beginning of the description to avoid sending too much text.
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
  return { items, total }
}

export async function createIngredient(database: DB, userId: string, input: CreateIngredientInput) {
  createIngredientSchema.parse(input)

  // I check if there are weird symbols like "<" to be sure no one puts bad code in the name.
  if (input.name.includes('<') || input.name.includes('>') || input.name.includes('javascript:')) {
    throw new IngredientError('ingredient_creation_failed', 'Nom invalide')
  }

  const currentUser = await getFullUserById(database, userId)
  const isAdmin = currentUser?.role === 'admin'

  try {
    const [ingredient] = await database
      .insert(ingredients)
      .values({
        ...input,
        createdBy: userId,
        // Only admins can choose their own slug. For others, I use the name to make it.
        slug: input.slug && isAdmin ? slugify(input.slug) : slugify(input.name),
      })
      .returning()

    if (!ingredient) throw new IngredientError('ingredient_creation_failed')

    return ingredient
  } catch (e) {
    if (e instanceof IngredientError) throw e
    // If the database says "hey, this already exists", I catch it here.
    if (isUniqueViolation(e)) throw new IngredientError('ingredient_already_exists')
    throw e
  }
}

export async function getIngredientById(database: DB, id: string) {
  const [ingredient] = await database
    .select()
    .from(ingredients)
    .where(eq(ingredients.id, id))
    .limit(1)

  if (!ingredient) throw new IngredientError('ingredient_not_found')
  return ingredient
}

export async function getIngredientBySlug(database: DB, slug: string) {
  const [ingredient] = await database
    .select()
    .from(ingredients)
    .where(eq(ingredients.slug, slug))
    .limit(1)

  if (!ingredient) throw new IngredientError('ingredient_not_found')
  return ingredient
}

export async function updateIngredient(
  database: DB,
  userId: string,
  id: string,
  data: UpdateIngredientInput,
  summary?: string,
  expectedUpdatedAt?: Date
) {
  updateIngredientSchema.parse(data)

  const oldIngredient = await getIngredientById(database, id)
  const currentUser = await getFullUserById(database, userId)

  // Admins are special, they can change the slug if they want.
  const isAdmin = currentUser?.role === 'admin'
  const nextSlug =
    data.slug && isAdmin ? slugify(data.slug) : data.name ? slugify(data.name) : undefined

  // If the new slug is different, I must check if someone else is already using it.
  if (nextSlug && nextSlug !== oldIngredient.slug) {
    const existing = await database.query.ingredients.findFirst({
      where: and(eq(ingredients.slug, nextSlug), ne(ingredients.id, id)),
    })

    if (existing) {
      throw new IngredientError('slug_already_exists')
    }

    data.slug = nextSlug
  } else {
    // I remove the slug from data if the user is not an admin, so they don't force it.
    delete data.slug
  }

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
    if (expectedUpdatedAt && oldIngredient.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new IngredientError('ingredient_update_conflict')
    }
    return oldIngredient
  }

  const whereConditions = [eq(ingredients.id, id)]
  if (expectedUpdatedAt) {
    whereConditions.push(eq(ingredients.updatedAt, expectedUpdatedAt))
  }

  try {
    const [newIngredient] = await database
      .update(ingredients)
      .set(filteredData)
      .where(and(...whereConditions))
      .returning()

    if (!newIngredient) {
      // If no row was updated, maybe someone else updated it first (conflict).
      if (expectedUpdatedAt) {
        throw new IngredientError('ingredient_update_conflict')
      }
      throw new IngredientError('ingredient_update_failed')
    }

    // Now I compare the old and the new ingredient to see what really changed.
    const changes: IngredientChanges = {}

    for (const key in data) {
      if (AUDIT_EXCLUDED_KEYS.has(key)) continue

      const k = key as keyof IngredientChanges
      const oldVal = oldIngredient[k]
      const newVal = newIngredient[k]

      if (!areEqual(oldVal, newVal)) {
        ;(changes as Record<string, FieldChange<unknown>>)[k] = {
          old: oldVal ?? null,
          new: newVal ?? null,
        }
      }
    }

    // If nothing changed in the audited fields, I don't need to log anything.
    if (Object.keys(changes).length === 0) return newIngredient

    const parsed = ingredientChangesSchema.parse(changes)

    // I save the history of changes here so we can see who did what later.
    await database.insert(ingredientEdits).values({
      ingredientId: id,
      editedBy: userId,
      summary: summary ?? null,
      changes: parsed,
    })

    return newIngredient
  } catch (e) {
    if (e instanceof IngredientError) throw e
    if (isUniqueViolation(e)) throw new IngredientError('slug_already_exists')
    throw e
  }
}

export async function deleteIngredient(database: DB, id: string) {
  const rows = await database
    .delete(ingredients)
    .where(eq(ingredients.id, id))
    .returning({ id: ingredients.id })

  if (!rows[0]) throw new IngredientError('ingredient_delete_failed')
}

export async function listIngredientEdits(database: DB, ingredientId: string) {
  return database
    .select()
    .from(ingredientEdits)
    .where(eq(ingredientEdits.ingredientId, ingredientId))
    .orderBy(sql`${ingredientEdits.createdAt} DESC`)
}

// I use a simple "ILIKE" search to find ingredients by their name or slug.
// It's very useful for the search bar on the front-end.
export async function searchIngredients(database: DB, query: string, limit = 10) {
  const pattern = `%${query}%`
  return database
    .select({
      id: ingredients.id,
      name: ingredients.name,
      slug: ingredients.slug,
      type: ingredients.type,
      category: ingredients.category,
    })
    .from(ingredients)
    .where(or(ilike(ingredients.name, pattern), ilike(ingredients.slug, pattern)))
    .orderBy(ingredients.name)
    .limit(limit)
}

export type IngredientFilterOptions = {
  tags: Record<IngredientFilterCategory, { name: string; slug: string }[]>
}

type IngredientFilterCategory = IngredientTagCategory

const INGREDIENT_FILTER_CATEGORIES = ingredientFilterCategories()

export async function getIngredientFilterOptions(database: DB): Promise<IngredientFilterOptions> {
  const tagRows = await database
    .selectDistinct({
      name: ingredientTagsDefs.label,
      slug: ingredientTagsDefs.slug,
      category: ingredientTagsDefs.tagType,
    })
    .from(ingredientTagsDefs)
    .innerJoin(tagIngredients, eq(ingredientTagsDefs.id, tagIngredients.ingredientTagId))
    .where(inArray(ingredientTagsDefs.tagType, INGREDIENT_FILTER_CATEGORIES))
    .orderBy(ingredientTagsDefs.tagType, ingredientTagsDefs.label)

  const empty = Object.fromEntries(
    INGREDIENT_FILTER_CATEGORIES.map((c) => [c, []])
  ) as unknown as IngredientFilterOptions['tags']

  for (const tag of tagRows) {
    if (!tag.category) continue
    const bucket = tag.category as IngredientFilterCategory
    if (bucket in empty) {
      empty[bucket].push({ name: tag.name, slug: tag.slug })
    }
  }

  return { tags: empty }
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
