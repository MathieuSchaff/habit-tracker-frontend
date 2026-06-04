import { z } from 'zod'

// Batch request: compatibility scores are computed on demand for the products
// currently displayed in the collection, to avoid an N+1 of per-product calls.
export const compatibilityScoresRequestSchema = z.object({
  productIds: z.array(z.uuid()).min(1).max(1000),
})
export type CompatibilityScoresRequest = z.infer<typeof compatibilityScoresRequestSchema>
