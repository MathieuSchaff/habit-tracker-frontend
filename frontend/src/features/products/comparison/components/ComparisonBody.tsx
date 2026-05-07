import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { CommonIngredientsSection } from './CommonIngredientsSection'
import { DiffSection } from './DiffSection'
import { MetaStrip } from './MetaStrip'
import { SignalsSection } from './SignalsSection'
import './ComparisonBody.css'

type Props = { products: EnrichedComparisonProduct[] }

export function ComparisonBody({ products }: Props) {
  return (
    <div className="comparison-body">
      <MetaStrip products={products} />
      <DiffSection products={products} />
      <SignalsSection products={products} />
      <CommonIngredientsSection products={products} />
    </div>
  )
}
