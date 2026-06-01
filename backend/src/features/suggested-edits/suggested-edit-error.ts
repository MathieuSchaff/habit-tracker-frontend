import type { CommonErrorCode } from '@aurore/shared'

export class SuggestedEditError extends Error {
  constructor(
    public code: CommonErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'SuggestedEditError'
  }
}
