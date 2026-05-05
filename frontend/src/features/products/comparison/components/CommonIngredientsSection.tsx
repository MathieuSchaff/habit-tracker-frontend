import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { ExpandableSection } from '@/component/Layout/ExpandableSection/ExpandableSection'
import { computeCommon } from '../helpers/aggregations'

type Props = { products: EnrichedComparisonProduct[] }

export function CommonIngredientsSection({ products }: Props) {
  const common = computeCommon(products)

  return (
    <section>
      <ExpandableSection title={`Communs à tous (${common.length})`}>
        <ul>
          {common.map((i) => (
            <li key={i.slug}>{i.inciName}</li>
          ))}
        </ul>
      </ExpandableSection>
    </section>
  )
}
