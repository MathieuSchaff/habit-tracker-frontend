import type { z } from 'zod'

import type {
  createProductSchema,
  patentSchema,
  productChangesSchema,
  updateProductSchema,
} from './schemas'

export type ProductSearchResult = {
  id: string
  name: string
  brand: string
  kind: string
  slug: string
}

export type ProductErrorCode =
  | 'product_not_found'
  | 'product_creation_failed'
  | 'product_update_failed'
  | 'product_delete_failed'
  | 'product_already_exists'
  | 'unauthorized_access'
  | 'database_error'

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductChanges = z.infer<typeof productChangesSchema>
export type Patent = z.infer<typeof patentSchema>
