import type { ProductComparisonErrorCode } from '@habit-tracker/shared'

export class ProductComparisonError extends Error {
  constructor(
    public code: ProductComparisonErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'ProductComparisonError'
  }
}
