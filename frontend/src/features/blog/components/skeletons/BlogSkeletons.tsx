import { Skeleton } from '@/component/Feedback/ui/Skeleton/Skeleton'
import './BlogSkeletons.css'

const CARD_PLACEHOLDERS = [1, 2, 3, 4, 5, 6]
const PARAGRAPH_LINES = [1, 2, 3, 4, 5]

export function BlogListSkeleton() {
  return (
    <div className="blog-list-skeleton__grid" aria-hidden="true">
      {CARD_PLACEHOLDERS.map((i) => (
        <div key={i} className="blog-list-skeleton__card">
          <Skeleton className="blog-list-skeleton__cover" />
          <div className="blog-list-skeleton__body">
            <Skeleton width="85%" height="1.25rem" />
            <Skeleton width="100%" height="0.875rem" />
            <Skeleton width="60%" height="0.875rem" />
          </div>
          <div className="blog-list-skeleton__footer">
            <Skeleton width="5rem" height="1.5rem" radius="var(--radius-full)" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function BlogArticleSkeleton() {
  return (
    <article className="blog-article blog-article-skeleton" aria-hidden="true">
      <Skeleton width="8rem" height="1rem" />

      <div className="blog-article-skeleton__header">
        <Skeleton width="80%" height="2.25rem" />
        <div className="blog-article-skeleton__meta">
          <Skeleton width="5rem" height="1.5rem" radius="var(--radius-full)" />
          <Skeleton width="7rem" height="0.875rem" />
        </div>
      </div>

      <Skeleton className="blog-article-skeleton__cover" />

      <Skeleton width="100%" height="1.125rem" />
      <Skeleton width="70%" height="1.125rem" />

      <div className="blog-article-skeleton__body">
        {PARAGRAPH_LINES.map((i) => (
          <Skeleton key={i} width={i === 5 ? '45%' : '100%'} height="0.875rem" />
        ))}
      </div>
    </article>
  )
}
