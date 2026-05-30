import type { EnrichedComparisonProduct } from '@aurore/shared'

import { CommonIngredientsSection } from './CommonIngredientsSection'
import { ComparisonHero } from './ComparisonHero'
import { CompatibilityCallout } from './CompatibilityCallout'
import { DiffSection } from './DiffSection'
import { MetaStrip } from './MetaStrip'
import { SignalsSection } from './SignalsSection'
import './ComparisonBody.css'

type Props = {
  products: EnrichedComparisonProduct[]
  /** Optional editorial header - falls back to a generic title when absent. */
  comparisonName?: string | null
  reference?: string
}

export function ComparisonBody({ products, comparisonName, reference }: Props) {
  return (
    <div className="comparison-body">
      <ComparisonHero reference={reference} count={products.length} name={comparisonName ?? null} />
      <MetaStrip products={products} />
      <CompatibilityCallout products={products} />
      <SignalsSection products={products} />
      <DiffSection products={products} />
      <CommonIngredientsSection products={products} />
    </div>
  )
}
