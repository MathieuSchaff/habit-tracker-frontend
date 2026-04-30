import { z } from 'zod'

import { COMPARISON_MAX_PRODUCTS, COMPARISON_MIN_PRODUCTS } from './comparison'

export const createComparisonSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  productIds: z.array(z.uuid()).min(COMPARISON_MIN_PRODUCTS).max(COMPARISON_MAX_PRODUCTS),
})

export const updateComparisonSchema = z.object({
  name: z.string().trim().min(1).max(120).nullable().optional(),
  productIds: z
    .array(z.uuid())
    .min(COMPARISON_MIN_PRODUCTS)
    .max(COMPARISON_MAX_PRODUCTS)
    .optional(),
})

export type CreateComparisonInput = z.infer<typeof createComparisonSchema>
export type UpdateComparisonInput = z.infer<typeof updateComparisonSchema>
