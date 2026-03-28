import type { IngredientErrorCode } from '@habit-tracker/shared'

// This is my custom error box for ingredients. I use it to send a specific code
// so the front-end knows exactly what went wrong (like "not found" or "already exists").
export class IngredientError extends Error {
  constructor(
    public code: IngredientErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'IngredientError'
  }
}
