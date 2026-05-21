import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { Sparkles } from 'lucide-react'

import { IconBox } from '@/component/Layout/IconBox/IconBox'
import { computeCompatibility } from '../helpers/compatibility'
import './CompatibilityCallout.css'

type Props = { products: EnrichedComparisonProduct[] }

export function CompatibilityCallout({ products }: Props) {
  const { band, commonCount, totalUnique, headline, verdict } = computeCompatibility(products)

  return (
    <aside
      className={`cmp-callout cmp-callout--${band}`}
      role="note"
      aria-label="Lecture qualitative de la comparaison"
    >
      <IconBox className="cmp-callout__seal">
        <Sparkles size={18} aria-hidden="true" />
      </IconBox>
      <div className="cmp-callout__body">
        <p className="cmp-callout__headline">{headline}</p>
        <p className="cmp-callout__verdict">{verdict}</p>
      </div>
      <p className="cmp-callout__meta">
        <span className="cmp-callout__meta-num">{commonCount}</span>
        <span className="cmp-callout__meta-sep">/</span>
        <span className="cmp-callout__meta-total">{totalUnique}</span>
        <span className="cmp-callout__meta-label">ingrédients en commun</span>
      </p>
    </aside>
  )
}
