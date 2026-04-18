import { Skeleton } from '@/component/Feedback/ui/Skeleton/Skeleton'
import { DetailPageLayout } from '@/component/Layout/PageLayout/DetailPageLayout'
import './IngredientLayoutSkeleton.css'

export function IngredientLayoutSkeleton() {
  return (
    <DetailPageLayout banner>
      <div className="ingredient-layout-skeleton__hero">
        <Skeleton width="3.5rem" height="3.5rem" radius="var(--radius-lg)" />
        <div className="ingredient-layout-skeleton__info">
          <Skeleton width="55%" height="1.75rem" />
          <Skeleton width="5rem" height="1.5rem" radius="var(--radius-full)" />
        </div>
      </div>

      <div className="ingredient-layout-skeleton__tabs">
        <Skeleton width="5rem" height="2.25rem" radius="var(--radius-full)" />
        <Skeleton width="7rem" height="2.25rem" radius="var(--radius-full)" />
      </div>

      <IngredientInfoSkeleton />
    </DetailPageLayout>
  )
}

export function IngredientInfoSkeleton() {
  return (
    <>
      <div className="ingredient-info-skeleton__section">
        <Skeleton width="6rem" height="1rem" />
        <div className="ingredient-info-skeleton__tags">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="5rem" height="1.5rem" radius="var(--radius-full)" />
          ))}
        </div>
      </div>

      <div className="ingredient-info-skeleton__section">
        <Skeleton width="7rem" height="1rem" />
        <Skeleton width="100%" height="6rem" radius="var(--radius-md)" />
      </div>

      <div className="ingredient-info-skeleton__section">
        <Skeleton width="5rem" height="1rem" />
        <div className="ingredient-info-skeleton__products">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ingredient-info-skeleton__product">
              <Skeleton width="2rem" height="2rem" radius="var(--radius-sm)" />
              <Skeleton width="45%" height="0.875rem" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function IngredientDiscussionSkeleton() {
  return (
    <div className="ingredient-discussion-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="ingredient-discussion-skeleton__thread">
          <Skeleton width="60%" height="1.25rem" />
          <Skeleton width="30%" height="0.75rem" />
          <Skeleton width="100%" height="2rem" />
        </div>
      ))}
    </div>
  )
}

export function IngredientThreadSkeleton() {
  return (
    <div className="ingredient-discussion-skeleton">
      <Skeleton width="10rem" height="2rem" radius="var(--radius-full)" />
      <Skeleton width="80%" height="1.5rem" />
      <Skeleton width="40%" height="0.75rem" />
      <Skeleton width="100%" height="6rem" radius="var(--radius-lg)" />
      {[1, 2].map((i) => (
        <div key={i} className="ingredient-discussion-skeleton__thread">
          <Skeleton width="30%" height="0.75rem" />
          <Skeleton width="100%" height="2rem" />
        </div>
      ))}
    </div>
  )
}
