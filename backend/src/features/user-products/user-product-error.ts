import type { StockErrorCode } from '@habit-tracker/shared'

export type UserProductErrorCode = StockErrorCode | 'not_found'

export class UserProductError extends Error {
  constructor(
    public code: UserProductErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'UserProductError'
  }
}
