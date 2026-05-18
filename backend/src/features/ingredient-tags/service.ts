import type { CreateTagInput, UpdateTagInput } from '@habit-tracker/shared'
import { createTagSchema, updateTagSchema } from '@habit-tracker/shared'

import slugify from '@sindresorhus/slugify'
import { and, eq, getTableColumns } from 'drizzle-orm'

import type { DB } from '../../db/index'
import { type Ingredient, ingredients } from '../../db/schema/ingredients/ingredients'
import {
  type IngredientTagDef,
  ingredientTagsDefs,
  tagIngredients,
} from '../../db/schema/tags/tags'
import { isUniqueViolation } from '../../lib/helpers'
import { TagError } from '../product-tags/tag-error'

// Ingredient tag definition CRUD
//
// getById, list, update, delete have no callers today. They stay
// symmetric with the product-tag service because future admin tooling
// for the ingredient taxonomy is plausible (custom UX tags, pedagogical
// groupings) and regenerating Drizzle wrappers later costs more than
// the ~60 LOC kept. KEEP BY DESIGN: if a future audit re-flags them,
// the correct fix is to wire admin routes (Phase 2), NOT to delete.
// Rationale: docs/02-engineering/audits/2026-05-16/p2-2.2-ingredient-tags-routes.md

export async function createIngredientTag(db: DB, data: CreateTagInput): Promise<IngredientTagDef> {
  createTagSchema.parse(data)
  const slug = data.slug ?? slugify(data.name)
  try {
    const [tag] = await db
      .insert(ingredientTagsDefs)
      .values({ slug, label: data.name, tagType: data.category ?? '' })
      .returning()
    if (!tag) throw new TagError('tag_creation_failed')
    return tag
  } catch (e) {
    if (e instanceof TagError) throw e
    if (isUniqueViolation(e)) throw new TagError('tag_already_exists')
    throw e
  }
}

export async function getIngredientTagById(
  db: DB,
  id: string
): Promise<IngredientTagDef | undefined> {
  const [tag] = await db
    .select()
    .from(ingredientTagsDefs)
    .where(eq(ingredientTagsDefs.id, id))
    .limit(1)
  return tag
}

export async function getIngredientTagBySlug(
  db: DB,
  slug: string
): Promise<IngredientTagDef | undefined> {
  const [tag] = await db
    .select()
    .from(ingredientTagsDefs)
    .where(eq(ingredientTagsDefs.slug, slug))
    .limit(1)
  return tag
}

export async function listIngredientTags(
  db: DB,
  params: { category?: string; limit?: number; offset?: number } = {}
) {
  const { category, limit = 100, offset = 0 } = params
  const where = category ? eq(ingredientTagsDefs.tagType, category) : undefined
  return db
    .select()
    .from(ingredientTagsDefs)
    .where(where)
    .limit(limit)
    .offset(offset)
    .orderBy(ingredientTagsDefs.label)
}

export async function updateIngredientTag(
  db: DB,
  id: string,
  data: UpdateTagInput
): Promise<IngredientTagDef> {
  updateTagSchema.parse(data)
  const patch: Partial<{ label: string; tagType: string; slug: string }> = {}
  if (data.name !== undefined) patch.label = data.name
  if (data.category !== undefined) patch.tagType = data.category
  if (data.slug !== undefined) patch.slug = data.slug
  try {
    const [tag] = await db
      .update(ingredientTagsDefs)
      .set(patch)
      .where(eq(ingredientTagsDefs.id, id))
      .returning()
    if (!tag) throw new TagError('tag_not_found')
    return tag
  } catch (e) {
    if (e instanceof TagError) throw e
    if (isUniqueViolation(e)) throw new TagError('tag_already_exists')
    throw e
  }
}

export async function deleteIngredientTag(db: DB, id: string): Promise<boolean> {
  const result = await db
    .delete(ingredientTagsDefs)
    .where(eq(ingredientTagsDefs.id, id))
    .returning({ id: ingredientTagsDefs.id })
  return result.length > 0
}

// Ingredient ↔ tag associations

export async function addTagToIngredient(
  db: DB,
  ingredientId: string,
  ingredientTagId: string,
  relevance: 'primary' | 'secondary' | 'avoid' = 'secondary'
) {
  const [link] = await db
    .insert(tagIngredients)
    .values({ ingredientId, ingredientTagId, relevance })
    .returning()
  return link
}

export async function addManyTagsToIngredient(
  db: DB,
  ingredientId: string,
  tagsInput: (string | { tagId: string; relevance?: 'primary' | 'secondary' | 'avoid' })[]
) {
  if (tagsInput.length === 0) return []

  const values = tagsInput.map((t) => {
    if (typeof t === 'string') {
      return { ingredientId, ingredientTagId: t, relevance: 'secondary' as const }
    }
    return {
      ingredientId,
      ingredientTagId: t.tagId,
      relevance: t.relevance ?? ('secondary' as const),
    }
  })

  return db.insert(tagIngredients).values(values).returning()
}

export async function listTagsByIngredient(db: DB, ingredientId: string) {
  return db
    .select({
      ingredientTagId: tagIngredients.ingredientTagId,
      ingredientId: tagIngredients.ingredientId,
      relevance: tagIngredients.relevance,
      tagName: ingredientTagsDefs.label,
      tagSlug: ingredientTagsDefs.slug,
      tagCategory: ingredientTagsDefs.tagType,
    })
    .from(tagIngredients)
    .innerJoin(ingredientTagsDefs, eq(tagIngredients.ingredientTagId, ingredientTagsDefs.id))
    .where(eq(tagIngredients.ingredientId, ingredientId))
    .orderBy(ingredientTagsDefs.tagType, ingredientTagsDefs.label)
}

export async function listIngredientsByTag(db: DB, ingredientTagId: string): Promise<Ingredient[]> {
  return db
    .select(getTableColumns(ingredients))
    .from(tagIngredients)
    .innerJoin(ingredients, eq(tagIngredients.ingredientId, ingredients.id))
    .where(eq(tagIngredients.ingredientTagId, ingredientTagId))
    .orderBy(ingredients.name)
}

export async function removeTagFromIngredient(
  db: DB,
  ingredientId: string,
  ingredientTagId: string
): Promise<boolean> {
  const result = await db
    .delete(tagIngredients)
    .where(
      and(
        eq(tagIngredients.ingredientId, ingredientId),
        eq(tagIngredients.ingredientTagId, ingredientTagId)
      )
    )
    .returning({ ingredientTagId: tagIngredients.ingredientTagId })
  return result.length > 0
}

export async function replaceIngredientTags(
  db: DB,
  ingredientId: string,
  tagsInput: (string | { tagId: string; relevance?: 'primary' | 'secondary' | 'avoid' })[]
) {
  return db.transaction(async (tx) => {
    await tx.delete(tagIngredients).where(eq(tagIngredients.ingredientId, ingredientId))

    if (tagsInput.length === 0) return []

    const values = tagsInput.map((t) => {
      if (typeof t === 'string') {
        return { ingredientId, ingredientTagId: t, relevance: 'secondary' as const }
      }
      return {
        ingredientId,
        ingredientTagId: t.tagId,
        relevance: t.relevance ?? ('secondary' as const),
      }
    })

    return tx.insert(tagIngredients).values(values).returning()
  })
}
