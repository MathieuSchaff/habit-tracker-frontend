import type { ArticleErrorCode } from '@aurore/shared'

export class BlogError extends Error {
  constructor(
    public code: ArticleErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'BlogError'
  }
}
