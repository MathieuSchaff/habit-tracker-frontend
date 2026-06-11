import { Skeleton } from '@/component/Feedback/ui/Skeleton/Skeleton'
import './ProductsGridSkeleton.css'

// Vary text line widths so cards don't look copy-pasted.
const CARD_PLACEHOLDERS: { id: number; lines: [string, string] }[] = [
  { id: 1, lines: ['75%', '55%'] },
  { id: 2, lines: ['90%', '40%'] },
  { id: 3, lines: ['65%', '70%'] },
  { id: 4, lines: ['80%', '50%'] },
  { id: 5, lines: ['70%', '60%'] },
  { id: 6, lines: ['85%', '45%'] },
  { id: 7, lines: ['60%', '75%'] },
  { id: 8, lines: ['78%', '52%'] },
]

export function ProductsGridSkeleton() {
  return (
    <div className="products-grid-skeleton">
      <span className="sr-only" role="status" aria-live="polite">
        Chargement des produits…
      </span>
      <ul className="list-grid products-grid-skeleton__grid" aria-hidden="true">
        {CARD_PLACEHOLDERS.map((card) => (
          <li key={card.id} className="products-grid-skeleton__card">
            <Skeleton className="products-grid-skeleton__image" />
            <div className="products-grid-skeleton__body">
              <Skeleton width="40%" height="0.6875rem" />
              <Skeleton width={card.lines[0]} height="1rem" />
              <Skeleton width={card.lines[1]} height="1rem" />
            </div>
            <div className="products-grid-skeleton__footer">
              <Skeleton width="4.5rem" height="1.5rem" radius="var(--radius-full)" />
              <Skeleton width="5rem" height="2rem" radius="var(--radius-md)" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
