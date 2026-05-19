import { z } from 'zod'

import { HTTP_STATUS, type HttpStatus } from '../core'

// SCHEMAS

export const userProductStatus = ['in_stock', 'wishlist', 'watched', 'archived', 'avoided'] as const

export const repurchaseFlag = ['yes', 'no', 'unsure'] as const

// Sentiment 1-5 = ressenti rapide. Level 6 is reserved for Holy Grail,
// folded into the sentiment scale so HG isn't a status.
export const HOLY_GRAIL_SENTIMENT = 6 as const

// User-experience tag catalogs surfaced in PDS §5. Statut group is
// intentionally omitted — bound to userProduct.status.
export const ressentiTags = [
  'leger',
  'riche',
  'collant',
  'confortable',
  'dessechant',
  'picotements',
  'aucun-souci',
  'incertain',
] as const

export const routineTags = [
  'matin',
  'soir',
  'sous-maquillage',
  'apres-exfoliation',
  'voyage',
  'hiver',
  'ete',
] as const

export const preferencesTags = [
  'sans-parfum',
  'eviter-pour-moi',
  'a-comparer',
  'a-reessayer',
] as const

export const userProductStatusSchema = z.enum(userProductStatus)
export const repurchaseFlagSchema = z.enum(repurchaseFlag)
export const ressentiTagSchema = z.enum(ressentiTags)
export const routineTagSchema = z.enum(routineTags)
export const preferencesTagSchema = z.enum(preferencesTags)

export const createUserProductSchema = z.object({
  productId: z.uuid(),
  status: userProductStatusSchema.default('in_stock'),
  sentiment: z.number().int().min(1).max(6).optional(),
  wouldRepurchase: repurchaseFlagSchema.optional(),
  comment: z.string().max(1000).optional(),
})

export const updateUserProductSchema = z.object({
  status: userProductStatusSchema.optional(),
  sentiment: z.number().int().min(1).max(6).nullable().optional(),
  wouldRepurchase: repurchaseFlagSchema.nullable().optional(),
  comment: z.string().max(1000).nullable().optional(),
  ressenti: z.array(ressentiTagSchema).optional(),
  routine: z.array(routineTagSchema).optional(),
  preferences: z.array(preferencesTagSchema).optional(),
  // Optional free-form note captured alongside a status transition. Persisted
  // to user_product_status_log only, never to user_products.comment. Ignored
  // when no status change is in the payload.
  reason: z.string().max(500).optional(),
})

export const updateUserProductReviewSchema = z.object({
  tolerance: z.number().int().min(1).max(5).nullable().optional(),
  efficacy: z.number().int().min(1).max(5).nullable().optional(),
  sensoriality: z.number().int().min(1).max(5).nullable().optional(),
  stability: z.number().int().min(1).max(5).nullable().optional(),
  mixability: z.number().int().min(1).max(5).nullable().optional(),
  valueForMoney: z.number().int().min(1).max(5).nullable().optional(),
  comment: z.string().max(5000).nullable().optional(),
  isPublic: z.boolean().optional(),
})

// Public reviews surface (#7) — only review fields + reviewer pseudonym.
// Sentiment/wouldRepurchase/experience tags stay private (live on user_products).
export const publicReviewViewSchema = z.object({
  tolerance: z.number().int().min(1).max(5).nullable(),
  efficacy: z.number().int().min(1).max(5).nullable(),
  sensoriality: z.number().int().min(1).max(5).nullable(),
  stability: z.number().int().min(1).max(5).nullable(),
  mixability: z.number().int().min(1).max(5).nullable(),
  valueForMoney: z.number().int().min(1).max(5).nullable(),
  comment: z.string().nullable(),
  createdAt: z.string(),
  reviewer: z.object({
    username: z.string(),
    profilePublic: z.boolean(),
  }),
})

// Qualitative aggregates — counts per bucket, never averages (anti-pattern).
export const reviewAxisKeys = [
  'tolerance',
  'efficacy',
  'sensoriality',
  'stability',
  'mixability',
  'valueForMoney',
] as const

export const reviewAxisAggregateSchema = z.object({
  low: z.number().int().min(0), // votes at 1-2
  mid: z.number().int().min(0), // votes at 3
  high: z.number().int().min(0), // votes at 4-5
})

export const publicReviewAggregatesSchema = z.object({
  total: z.number().int().min(0),
  byAxis: z.object({
    tolerance: reviewAxisAggregateSchema,
    efficacy: reviewAxisAggregateSchema,
    sensoriality: reviewAxisAggregateSchema,
    stability: reviewAxisAggregateSchema,
    mixability: reviewAxisAggregateSchema,
    valueForMoney: reviewAxisAggregateSchema,
  }),
})

export const publicProductReviewsResponseSchema = z.object({
  reviews: z.array(publicReviewViewSchema),
  aggregates: publicReviewAggregatesSchema,
})

// TYPES

export type UserProductStatus = z.infer<typeof userProductStatusSchema>
export type RepurchaseFlag = z.infer<typeof repurchaseFlagSchema>
export type RessentiTag = z.infer<typeof ressentiTagSchema>
export type RoutineTag = z.infer<typeof routineTagSchema>
export type PreferencesTag = z.infer<typeof preferencesTagSchema>
export type CreateUserProductInput = z.infer<typeof createUserProductSchema>
export type UpdateUserProductInput = z.infer<typeof updateUserProductSchema>
export type UpdateUserProductReviewInput = z.infer<typeof updateUserProductReviewSchema>
export type ReviewAxisKey = (typeof reviewAxisKeys)[number]
export type ReviewAxisAggregate = z.infer<typeof reviewAxisAggregateSchema>
export type PublicReviewView = z.infer<typeof publicReviewViewSchema>
export type PublicReviewAggregates = z.infer<typeof publicReviewAggregatesSchema>
export type PublicProductReviewsResponse = z.infer<typeof publicProductReviewsResponseSchema>

export type UserProductErrorCode =
  | 'user_product_not_found'
  | 'user_product_creation_failed'
  | 'user_product_update_failed'
  | 'user_product_delete_failed'
  | 'database_error'

// HELPERS

export const userProductErrorMapping = {
  user_product_not_found: HTTP_STATUS.NOT_FOUND,
  user_product_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  user_product_update_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  user_product_delete_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  database_error: HTTP_STATUS.INTERNAL_SERVER_ERROR,
} as const satisfies Record<UserProductErrorCode, HttpStatus>
