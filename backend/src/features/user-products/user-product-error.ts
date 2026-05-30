import type { UserProductErrorCode } from '@aurore/shared'

export class UserProductError extends Error {
  constructor(
    public code: UserProductErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'UserProductError'
  }
}
