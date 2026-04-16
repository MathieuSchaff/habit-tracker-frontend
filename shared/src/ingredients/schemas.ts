import { z } from 'zod'

import { fieldChangeSchema } from '../core'
import { INGREDIENT_TYPE_VALUES } from './ingredient-types'

// SCHEMAS

const uuid = z.uuid()

const slugSchema = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })

const ingredientTypeSchema = z.enum(INGREDIENT_TYPE_VALUES)

export const createIngredientSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  slug: slugSchema.optional(),
  content: z.string().max(50000).optional(),
  type: ingredientTypeSchema.optional(),
  category: z.string().min(1).max(100).optional(),
})

export const updateIngredientSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: slugSchema.optional(),
    description: z.string().max(2000).optional(),
    content: z.string().max(50000).optional(),
    type: ingredientTypeSchema.optional(),
    category: z.string().min(1).max(100).nullable().optional(),
  })
  .strict()

export const ingredientResponseSchema = z.object({
  id: uuid,
  createdBy: uuid,
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  content: z.string(),
  type: ingredientTypeSchema,
  category: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const ingredientSearchResultSchema = z.object({
  id: uuid,
  name: z.string(),
  slug: z.string(),
  type: ingredientTypeSchema,
  category: z.string().nullable(),
})

export const ingredientEditResponseSchema = z.object({
  id: uuid,
  ingredientId: uuid,
  editedBy: uuid,
  changes: z.record(
    z.string(),
    z.object({
      old: z.string().nullable(),
      new: z.string().nullable(),
    })
  ),
  summary: z.string().nullable(),
  createdAt: z.date(),
})

// partial because an edit can touch only some fields, but at least one is required
export const ingredientChangesSchema = z
  .object({
    name: fieldChangeSchema(z.string()),
    description: fieldChangeSchema(z.string()),
    content: fieldChangeSchema(z.string()),
    type: fieldChangeSchema(z.string()),
    category: fieldChangeSchema(z.string()),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field change is required',
  })

const ingredientTagItemSchema = z.object({ name: z.string(), slug: z.string() })

export const ingredientFilterOptionsSchema = z.object({
  tags: z.object({
    skin_type: z.array(ingredientTagItemSchema),
    concern: z.array(ingredientTagItemSchema),
    // Rôle fonctionnel : propriété intrinsèque de molécule.
    ingredient_attribute: z.array(ingredientTagItemSchema),
    // Rendu sur peau — slugs scope='both' uniquement (occlusif,
    // matifiant, repulpant, protection-cutanee).
    skin_effect: z.array(ingredientTagItemSchema),
    // Comédogénicité — paire comedogene/non-comedogene.
    shared_label: z.array(ingredientTagItemSchema),
  }),
})

// coerce because query params always arrive as strings
export const ingredientsSearchSchema = z.object({
  concern: z.string().optional(),
  skin_type: z.string().optional(),
  ingredient_attribute: z.string().optional(),
  skin_effect: z.string().optional(),
  shared_label: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(['name', 'random']).optional(),
})

export const updateIngredientRouteSchema = updateIngredientSchema.extend({
  expectedUpdatedAt: z.coerce.date().optional(),
  summary: z.string().max(500).optional(),
})
