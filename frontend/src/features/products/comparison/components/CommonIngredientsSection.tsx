import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { useMemo } from 'react'

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
    <section className="terroir">
      <header className="terroir__head">
        <div>
          <p className="terroir__eyebrow">Terrain commun</p>
          <h2 className="terroir__title">
            Le <em>terroir</em> partagé
          </h2>
        </div>
        <span className="terroir__count">
          {common.length} ingrédient{common.length > 1 ? 's' : ''} · {products.length}/
          {products.length} formules
        </span>
      </header>

      {common.length === 0 ? (
        <p className="terroir__empty">
          Aucun ingrédient n’apparaît dans toutes les formules. Elles peuvent jouer des rôles
          complémentaires dans une routine.
        </p>
      ) : (
        <>
          {sortedActives.length > 0 && (
            <div className="terroir__group">
              <p className="terroir__group-label">Actifs communs</p>
              <ul className="terroir__pills">
                {sortedActives.map((i) => (
                  <li key={i.slug} className="terroir-pill terroir-pill--active">
                    <span className="terroir-pill__pos">#{Math.round(avgPosition(i.slug))}</span>
                    {i.inciName}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sortedOthers.length > 0 && (
            <div className="terroir__group">
              <p className="terroir__group-label">Autres communs</p>
              <ul className="terroir__pills">
                {sortedOthers.map((i) => (
                  <li key={i.slug} className="terroir-pill">
                    <span className="terroir-pill__pos">#{Math.round(avgPosition(i.slug))}</span>
                    {i.inciName}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
