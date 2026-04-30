import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { CommonIngredientsSection } from './CommonIngredientsSection'
import { MetaStrip } from './MetaStrip'
import { PerProductSpecificsSection } from './PerProductSpecificsSection'
import { SignalsSection } from './SignalsSection'

type Props = { products: EnrichedComparisonProduct[] }

export function ComparisonBody({ products }: Props) {
  return (
    <div>
      <MetaStrip products={products} />
      <SignalsSection products={products} />
      <CommonIngredientsSection products={products} />
      <PerProductSpecificsSection products={products} />
    </div>
  )
}
