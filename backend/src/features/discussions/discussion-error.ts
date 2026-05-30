import type { DiscussionErrorCode } from '@aurore/shared'

export class DiscussionError extends Error {
  constructor(
    public code: DiscussionErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'DiscussionError'
  }
}
