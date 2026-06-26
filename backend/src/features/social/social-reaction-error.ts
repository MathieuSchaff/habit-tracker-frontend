import type { SocialReactionErrorCode } from '@aurore/shared'

export class SocialReactionError extends Error {
  constructor(
    public code: SocialReactionErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'SocialReactionError'
  }
}
