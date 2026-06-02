import type { IngredientErrorCode } from '@aurore/shared'

export class IngredientError extends Error {
  constructor(
    public code: IngredientErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'IngredientError'
  }
}
