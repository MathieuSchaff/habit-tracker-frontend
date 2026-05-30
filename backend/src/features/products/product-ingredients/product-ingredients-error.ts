import type { ProductIngredientErrorCode } from '@aurore/shared'

export class ProductIngredientError extends Error {
  constructor(
    public code: ProductIngredientErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'ProductIngredientError'
  }
}
