import { type Ingredient, ingredients } from '../../db/schema/ingredients/ingredients'
import {
  type IngredientTagType,
  ingredientTagLinks,
  ingredientTagTypes,
} from '../../db/schema/tags/tags'
import { createTagService } from '../_tags/lib/createTagService'

// KEEP BY DESIGN: getById/list/update/delete have no callers today but mirror
// product-tag service symmetry for future admin tooling. Correct fix if re-flagged:
// wire admin routes (Phase 2), not delete.

type IngredientTagLink = typeof ingredientTagLinks.$inferSelect

interface IngredientTagProjection {
  ingredientTagId: string
  ingredientId: string
  relevance: 'primary' | 'secondary' | 'avoid'
  tagName: string
  tagSlug: string
  tagCategory: string
}

const service = createTagService<
  IngredientTagType,
  Ingredient,
  IngredientTagProjection,
  IngredientTagLink
>({
  defs: ingredientTagTypes,
  defsId: ingredientTagTypes.id,
  defsSlug: ingredientTagTypes.slug,
  defsLabel: ingredientTagTypes.label,
  defsTagType: ingredientTagTypes.tagType,

  links: ingredientTagLinks,
  linkTagIdCol: ingredientTagLinks.ingredientTagId,
  linkOwnerIdCol: ingredientTagLinks.ingredientId,

  ownerTable: ingredients,
  ownerIdCol: ingredients.id,
  ownerNameCol: ingredients.name,

  buildLinkValues: (ingredientId, ingredientTagId, relevance) => ({
    ingredientId,
    ingredientTagId,
    relevance,
  }),
  linkProjection: {
    ingredientTagId: ingredientTagLinks.ingredientTagId,
    ingredientId: ingredientTagLinks.ingredientId,
    relevance: ingredientTagLinks.relevance,
    tagName: ingredientTagTypes.label,
    tagSlug: ingredientTagTypes.slug,
    tagCategory: ingredientTagTypes.tagType,
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
