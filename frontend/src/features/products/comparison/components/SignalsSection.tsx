import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { computeAlerts, computeConflicts, computeSharedActives } from '../helpers/aggregations'
import './SignalsSection.css'

type Props = { products: EnrichedComparisonProduct[] }

export function SignalsSection({ products }: Props) {
  const actives = computeSharedActives(products)
  const alerts = computeAlerts(products)
  const conflicts = computeConflicts(products)
  const total = products.length

  if (actives.length === 0 && alerts.length === 0 && conflicts.length === 0) {
    return (
      <section className="signals-section">
        <h2 className="signals-section__title">Signaux</h2>
        <p className="signals-section__none">Aucun signal détecté.</p>
      </section>
    )
  }

  return (
    <section className="signals-section">
      <h2 className="signals-section__title">Signaux</h2>
      <div className="signals-section__groups">
        {actives.length > 0 && (
          <div className="signals-group signals-group--actives">
            <p className="signals-group__header">
              <span className="signals-group__icon">✦</span>
              Actifs partagés
            </p>
            <ul className="signals-group__pills">
              {actives.map((i) => (
                <li key={i.slug} className="signals-pill signals-pill--active">
                  {i.inciName}
                </li>
              ))}
            </ul>
          </div>
        )}
        {alerts.length > 0 && (
          <div className="signals-group signals-group--alerts">
            <p className="signals-group__header">
              <span className="signals-group__icon">⚠</span>
              Alertes
            </p>
            <ul className="signals-group__pills">
              {alerts.map((a) => (
                <li key={a.slug} className="signals-pill signals-pill--alert">
                  {a.inciName}
                  <span className="signals-pill__detail">
                    {' '}
                    ({a.presentIn.length}/{total})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {conflicts.length > 0 && (
          <div className="signals-group signals-group--conflicts">
            <p className="signals-group__header">
              <span className="signals-group__icon">⊗</span>
              Conflits
            </p>
            <ul className="signals-group__pills">
              {conflicts.map((c) => (
                <li key={`${c.a}-${c.b}`} className="signals-pill signals-pill--conflict">
                  {c.a} + {c.b}
                  {c.note && <span className="signals-pill__detail"> — {c.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
