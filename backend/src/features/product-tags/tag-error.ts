import type { TagErrorCode } from '@aurore/shared'

export class TagError extends Error {
  constructor(
    public code: TagErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'TagError'
  }
}
