import { type Ingredient, ingredients } from '../../db/schema/ingredients/ingredients'
import {
  type IngredientTagDef,
  ingredientTagsDefs,
  tagIngredients,
} from '../../db/schema/tags/tags'
import { createTagService } from '../_tags/lib/createTagService'

// getById, list, update, delete have no callers today. They stay
// symmetric with the product-tag service because future admin tooling
// for the ingredient taxonomy is plausible (custom UX tags, pedagogical
// groupings) and regenerating Drizzle wrappers later costs more than
// the ~60 LOC kept. KEEP BY DESIGN: if a future audit re-flags them,
// the correct fix is to wire admin routes (Phase 2), NOT to delete.
// Rationale: docs/02-engineering/audits/2026-05-16/p2-2.2-ingredient-tags-routes.md

type IngredientTagLink = typeof tagIngredients.$inferSelect

export interface IngredientTagProjection {
  ingredientTagId: string
  ingredientId: string
  relevance: 'primary' | 'secondary' | 'avoid'
  tagName: string
  tagSlug: string
  tagCategory: string
}

const service = createTagService<
  IngredientTagDef,
  Ingredient,
  IngredientTagProjection,
  IngredientTagLink
>({
  defs: ingredientTagsDefs,
  defsId: ingredientTagsDefs.id,
  defsSlug: ingredientTagsDefs.slug,
  defsLabel: ingredientTagsDefs.label,
  defsTagType: ingredientTagsDefs.tagType,

  links: tagIngredients,
  linkTagIdCol: tagIngredients.ingredientTagId,
  linkOwnerIdCol: tagIngredients.ingredientId,

  ownerTable: ingredients,
  ownerIdCol: ingredients.id,
  ownerNameCol: ingredients.name,

  buildLinkValues: (ingredientId, ingredientTagId, relevance) => ({
    ingredientId,
    ingredientTagId,
    relevance,
  }),
  linkProjection: {
    ingredientTagId: tagIngredients.ingredientTagId,
    ingredientId: tagIngredients.ingredientId,
    relevance: tagIngredients.relevance,
    tagName: ingredientTagsDefs.label,
    tagSlug: ingredientTagsDefs.slug,
    tagCategory: ingredientTagsDefs.tagType,
  },
})

export const createIngredientTag = service.create
export const getIngredientTagById = service.getById
export const getIngredientTagBySlug = service.getBySlug
export const listIngredientTags = service.list
export const updateIngredientTag = service.update
export const deleteIngredientTag = service.remove
export const addTagToIngredient = service.addToOwner
export const addManyTagsToIngredient = service.addManyToOwner
export const listTagsByIngredient = service.listTagsByOwner
export const listIngredientsByTag = service.listOwnersByTag
export const removeTagFromIngredient = service.removeFromOwner
export const replaceIngredientTags = service.replaceOwnerTags
