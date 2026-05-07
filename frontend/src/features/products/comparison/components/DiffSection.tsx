import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { computeCommon, computeSpecifics } from '../helpers/aggregations'
import './DiffSection.css'

type Props = { products: EnrichedComparisonProduct[] }

const VISIBLE_DEFAULT = 8

function computeOverlap(products: EnrichedComparisonProduct[]) {
  const common = computeCommon(products)
  const allSlugs = new Set(products.flatMap((p) => p.ingredients.map((i) => i.slug)))
  const jaccard = allSlugs.size > 0 ? Math.round((common.length / allSlugs.size) * 100) : 0
  return { commonCount: common.length, totalUnique: allSlugs.size, jaccard }
}

export function DiffSection({ products }: Props) {
  const specifics = computeSpecifics(products)
  const { commonCount, totalUnique, jaccard } = computeOverlap(products)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const colStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${products.length}, minmax(min(100%, 200px), 1fr))`,
  }

  return (
    <section className="diff-section">
      <div className="diff-section__header">
        <h2 className="diff-section__title">Différences</h2>
        <div className="diff-section__overlap">
          <div className="diff-section__overlap-bar" aria-hidden>
            <div className="diff-section__overlap-fill" style={{ width: `${jaccard}%` }} />
          </div>
          <span className="diff-section__overlap-label">
            {jaccard}% similaires · {commonCount}/{totalUnique} ingrédients en commun
          </span>
        </div>
      </div>

      <div className="diff-section__grid" style={colStyle}>
        {products.map((p) => {
          // Sort by position ascending = most concentrated first
          const list = [...(specifics.get(p.id) ?? [])].sort((a, b) => a.position - b.position)
          const isExpanded = expanded.has(p.id)
          const visible = isExpanded ? list : list.slice(0, VISIBLE_DEFAULT)
          const hidden = list.length - VISIBLE_DEFAULT

          return (
            <div key={p.id} className="diff-section__col">
              <p className="diff-section__col-header">
                <span className="diff-section__col-brand">{p.brand}</span>
                <span className="diff-section__col-count">{list.length} exclusifs</span>
              </p>

              {list.length === 0 ? (
                <p className="diff-section__empty">Aucun ingrédient exclusif.</p>
              ) : (
                <ul className="diff-section__pills">
                  {visible.map((i) => (
                    <li
                      key={i.slug}
                      className={`diff-pill${i.signals.includes('active') ? ' diff-pill--active' : ''}`}
                    >
                      <span className="diff-pill__pos">#{i.position}</span>
                      {i.inciName}
                    </li>
                  ))}
                </ul>
              )}

              {hidden > 0 && (
                <Button
                  variant="bare"
                  className="diff-section__more"
                  onClick={() => toggleExpand(p.id)}
                >
                  {isExpanded ? 'Voir moins' : `+ ${hidden} autres`}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
