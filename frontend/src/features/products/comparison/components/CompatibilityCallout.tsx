import type { EnrichedComparisonProduct } from '@aurore/shared'

import { computeCompatibility } from '../helpers/compatibility'
import './CompatibilityCallout.css'

type Props = { products: EnrichedComparisonProduct[] }

export function CompatibilityCallout({ products }: Props) {
  const { band, commonCount, headline, verdict } = computeCompatibility(products)
  const commonLabel = `${commonCount} ingrédient${commonCount > 1 ? 's' : ''} en commun`

  return (
    <aside
      className={`cmp-callout cmp-callout--${band}`}
      role="note"
      aria-label="Lecture qualitative de la comparaison"
    >
      <p className="cmp-callout__eyebrow">
        <span className="cmp-callout__eyebrow-dot" aria-hidden="true" />
        Lecture d'ensemble
      </p>
      <p className="cmp-callout__headline">{headline}</p>
      <p className="cmp-callout__verdict">{verdict}</p>
      <p className="cmp-callout__common">
        <span className="cmp-callout__common-dot" aria-hidden="true" />
        {commonLabel}
      </p>
    </aside>
  )
}
