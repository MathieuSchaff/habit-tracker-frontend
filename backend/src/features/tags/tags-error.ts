import type { TagErrorCode } from '@habit-tracker/shared'

export class TagError extends Error {
  constructor(
    public code: TagErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'TagError'
  }
}
