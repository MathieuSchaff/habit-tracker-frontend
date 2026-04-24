import type { z } from 'zod'

import type { FieldChange } from '../core'
import type {
  createProductSchema,
  patentSchema,
  productChangesSchema,
  productEditResponseSchema,
  updateProductSchema,
} from './schemas'

export type Product = {
  id: string
  createdBy: string
  name: string
  slug: string
  brand: string
  category: string | null
  kind: string
  unit: string

  inci: string | null
  description: string | null

  totalAmount: number | null
  amountUnit: string | null

  url: string | null
  imageUrl: string | null
  notes: string | null
  priceCents: number | null

  // ISO string on the wire, Date in memory
  createdAt: string | Date
  updatedAt: string | Date
}

export type EditableProductKeys = Exclude<keyof Product, 'id' | 'createdBy' | 'createdAt' | 'slug'>

// Manual type used by the edit system (distinct from the Zod-inferred ProductChanges below)
type ProductEditChanges = {
  [K in EditableProductKeys]?: FieldChange<Product[K]>
}

export type ProductEdit = {
  id: string
  productId: string
  editedBy: string
  changes: ProductEditChanges
  summary: string | null
  createdAt: string | Date
}

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

// z.infer<> aliases moved from schemas.ts

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductEditResponseSchema = z.infer<typeof productEditResponseSchema>
export type ProductChanges = z.infer<typeof productChangesSchema>
export type Patent = z.infer<typeof patentSchema>
