import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { useMemo } from 'react'

import { ExpandableSection } from '@/component/Layout/ExpandableSection/ExpandableSection'
import { computeCommon } from '../helpers/aggregations'
import './IngredientsSection.css'

type Props = { products: EnrichedComparisonProduct[] }

const NO_POSITION = 999

// Average ingredient position across products; lowest = highest concentration.
function buildAvgPositions(products: EnrichedComparisonProduct[]): Map<string, number> {
  const sums = new Map<string, { sum: number; count: number }>()
  for (const product of products) {
    for (const ing of product.ingredients) {
      const acc = sums.get(ing.slug) ?? { sum: 0, count: 0 }
      acc.sum += ing.position
      acc.count += 1
      sums.set(ing.slug, acc)
    }
  }
  return new Map(Array.from(sums, ([slug, { sum, count }]) => [slug, sum / count]))
}

export function CommonIngredientsSection({ products }: Props) {
  const common = computeCommon(products)
  const avgPositions = useMemo(() => buildAvgPositions(products), [products])
  const avgPosition = (slug: string) => avgPositions.get(slug) ?? NO_POSITION

  const actives = common.filter((i) => i.signals.includes('active'))
  const others = common.filter((i) => !i.signals.includes('active'))

  const sortedActives = [...actives].sort((a, b) => avgPosition(a.slug) - avgPosition(b.slug))
  const sortedOthers = [...others].sort((a, b) => avgPosition(a.slug) - avgPosition(b.slug))

  return (
    <section className="ingredients-section">
      <ExpandableSection title={`Ingrédients communs (${common.length})`} defaultOpen>
        {common.length === 0 ? (
          <p className="ingredients-section__empty">Aucun ingrédient commun.</p>
        ) : (
          <>
            {sortedActives.length > 0 && (
              <ul className="ingredients-section__pills ingredients-section__pills--actives">
                {sortedActives.map((i) => (
                  <li key={i.slug} className="ingredient-pill ingredient-pill--active">
                    <span className="ingredient-pill__pos">#{Math.round(avgPosition(i.slug))}</span>
                    {i.inciName}
                  </li>
                ))}
              </ul>
            )}
            {sortedOthers.length > 0 && (
              <ul className="ingredients-section__pills">
                {sortedOthers.map((i) => (
                  <li key={i.slug} className="ingredient-pill">
                    <span className="ingredient-pill__pos">#{Math.round(avgPosition(i.slug))}</span>
                    {i.inciName}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </ExpandableSection>
    </section>
  )
}
