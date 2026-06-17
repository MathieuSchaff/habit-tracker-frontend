import type { ProfileErrorCode } from '@aurore/shared'

export class ProfileError extends Error {
  constructor(
    public code: ProfileErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'ProfileError'
  }
}
