import type { SocialPostErrorCode } from '@aurore/shared'

export class SocialPostError extends Error {
  constructor(
    public code: SocialPostErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'SocialPostError'
  }
}
