import clsx from 'clsx'
import type { ReactNode } from 'react'

import './DetailHero.css'

interface DetailHeroProps {
  /** Visual artefact on the left - ProductImage, IconBox, etc. Sized by the caller. */
  media: ReactNode
  /** Small overline above the title - brand · kind for products, category for ingredients. */
  eyebrow?: ReactNode
  /** Main heading. Rendered as <h1>. */
  title: ReactNode
  /** View Transition name applied on the title (for cross-route morphs). */
  titleViewTransition?: string
  /** Calm chip row under the title - Badge, amount, count. */
  chips?: ReactNode
  /** Right-aligned aside - price or status. */
  aside?: ReactNode
  className?: string
}

export function DetailHero({
  media,
  eyebrow,
  title,
  titleViewTransition,
  chips,
  aside,
  className,
}: DetailHeroProps) {
  return (
    <header className={clsx('detail-hero', aside && 'detail-hero--has-aside', className)}>
      <div className="detail-hero__media">{media}</div>
      <div className="detail-hero__body">
        {eyebrow && <p className="detail-hero__eyebrow">{eyebrow}</p>}
        <h1
          className="detail-hero__title"
          style={titleViewTransition ? { viewTransitionName: titleViewTransition } : undefined}
        >
          {title}
        </h1>
        {chips && <div className="detail-hero__chips">{chips}</div>}
      </div>
      {aside && <div className="detail-hero__aside">{aside}</div>}
    </header>
  )
}
