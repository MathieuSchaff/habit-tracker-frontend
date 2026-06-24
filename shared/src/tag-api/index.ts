import { z } from 'zod'

import { HTTP_STATUS, type HttpStatus } from '../core'

// SCHEMAS

export const relevanceValues = ['primary', 'secondary', 'avoid'] as const

export const relevanceEnum = z.enum(relevanceValues)

// Origin of a tag_products row. 'manual' covers any tag posted via the
// product-tags CRUD path (admin endpoint, seed-curated, test fixture).
// The non-'manual' values are the AutoTagSource union: the backend derives
// `AutoTagSource = Exclude<TagSource, 'manual'>` from this array, so the two
// cannot drift. Used by auto-tag intake to DELETE only its own rows
// (preserving manual curation) before re-inserting.
export const tagSourceValues = [
  'manual',
  'algo-derm',
  'actif-class',
  'kind',
  'formula',
  'cross-signal',
  'interaction',
  'concentration',
  'brand',
  'percent-claim',
] as const
export type TagSource = (typeof tagSourceValues)[number]

export const createTagSchema = z.object({
  label: z.string().min(1).max(100),
  tagType: z.string().min(1).max(50).optional(),
  slug: z.string().max(100).optional(),
})

export const updateTagSchema = createTagSchema.partial()

export const addIngredientTagSchema = z.object({
  tagId: z.uuid(),
  relevance: relevanceEnum.optional().default('secondary'),
})

export const replaceIngredientTagsSchema = z.object({
  tags: z.array(
    z.object({
      tagId: z.uuid(),
      relevance: relevanceEnum.optional().default('secondary'),
    })
  ),
})

export const replaceProductTagsSchema = z.object({
  tags: z.array(
    z.object({
      tagId: z.uuid(),
      relevance: relevanceEnum.optional().default('secondary'),
    })
  ),
})

// TYPES

export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
export type ReplaceIngredientTagsInput = z.infer<typeof replaceIngredientTagsSchema>

export type TagErrorCode =
  | 'tag_not_found'
  | 'tag_already_exists'
  | 'tag_creation_failed'
  | 'database_error'

// HELPERS

export const tagErrorMapping = {
  tag_not_found: HTTP_STATUS.NOT_FOUND,
  tag_already_exists: HTTP_STATUS.CONFLICT,
  tag_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  database_error: HTTP_STATUS.INTERNAL_SERVER_ERROR,
} as const satisfies Record<TagErrorCode, HttpStatus>
