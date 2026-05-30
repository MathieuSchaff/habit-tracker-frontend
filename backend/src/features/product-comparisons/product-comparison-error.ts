import type { ProductComparisonErrorCode } from '@aurore/shared'

export class ProductComparisonError extends Error {
  constructor(
    public code: ProductComparisonErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'ProductComparisonError'
  }
}
