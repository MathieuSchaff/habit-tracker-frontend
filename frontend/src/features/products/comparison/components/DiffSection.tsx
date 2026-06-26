import type { EnrichedComparisonProduct } from '@aurore/shared'

import { useId, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { computeSpecifics } from '../helpers/aggregations'
import './DiffSection.css'

import { productTone } from './productTones'

type Props = { products: EnrichedComparisonProduct[] }

const VISIBLE_DEFAULT = 8

export function DiffSection({ products }: Props) {
  const specifics = computeSpecifics(products)
  const baseId = useId()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const colStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${products.length}, minmax(min(100%, 12.5rem), 1fr))`,
  }

  return (
    <section className="diff-section">
      <header className="diff-section__header">
        <h2 className="diff-section__title">Différences</h2>
        <p className="diff-section__lede">
          Ce que chaque formule porte en propre. Différent ne veut pas dire mieux.
        </p>
      </header>

      <div className="diff-section__grid" style={colStyle}>
        {products.map((p, i) => {
          // Ascending position = most concentrated first.
          const list = (specifics.get(p.id) ?? []).toSorted((a, b) => a.position - b.position)
          const isExpanded = expanded.has(p.id)
          const visible = isExpanded ? list : list.slice(0, VISIBLE_DEFAULT)
          const hidden = list.length - VISIBLE_DEFAULT
          const colId = `${baseId}-${p.id}`

          return (
            <div key={p.id} className="diff-section__col" style={productTone(i)}>
              <p className="diff-section__col-header">
                <span className="diff-section__col-num">N° {String(i + 1).padStart(2, '0')}</span>
                <span className="diff-section__col-brand">{p.brand}</span>
                <span className="diff-section__col-count">{list.length} en propre</span>
              </p>

              {list.length === 0 ? (
                <p className="diff-section__empty">Aucun ingrédient en propre.</p>
              ) : (
                <ul role="list" id={colId} className="diff-section__pills">
                  {visible.map((i) => (
                    <li key={i.slug} className="diff-pill">
                      <span
                        className="diff-pill__pos"
                        role="img"
                        aria-label={`position INCI ${i.position}`}
                      >
                        #{i.position}
                      </span>
                      {i.inciName}
                      {i.signals.includes('active') && (
                        <span className="diff-pill__active" role="img" aria-label="actif" />
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {hidden > 0 && (
                <Button
                  variant="bare"
                  className="diff-section__more"
                  onClick={() => toggleExpand(p.id)}
                  aria-expanded={isExpanded}
                  aria-controls={colId}
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
