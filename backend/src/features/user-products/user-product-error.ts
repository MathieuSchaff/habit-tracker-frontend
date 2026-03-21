import type { UserProductErrorCode } from '@habit-tracker/shared'

export class UserProductError extends Error {
  constructor(
    public code: UserProductErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'UserProductError'
  }
}
