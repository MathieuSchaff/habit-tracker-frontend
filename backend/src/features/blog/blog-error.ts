import type { ArticleErrorCode } from '@habit-tracker/shared'

export class BlogError extends Error {
  constructor(
    public code: ArticleErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'BlogError'
  }
}
