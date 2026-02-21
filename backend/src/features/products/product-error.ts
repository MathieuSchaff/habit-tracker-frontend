import type { ProductErrorCode } from '@habit-tracker/shared'

export class ProductError extends Error {
  constructor(
    public code: ProductErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'ProductError'
  }
}
