import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { computeAlerts, computeConflicts, computeSharedActives } from '../helpers/aggregations'

type Props = { products: EnrichedComparisonProduct[] }

export function SignalsSection({ products }: Props) {
  const actives = computeSharedActives(products)
  const alerts = computeAlerts(products)
  const conflicts = computeConflicts(products)
  const total = products.length

  if (actives.length === 0 && alerts.length === 0 && conflicts.length === 0) {
    return <p>Aucun signal détecté.</p>
  }

  return (
    <section>
      <h2>Signaux</h2>
      {actives.length > 0 && (
        <div>
          <h3>Actifs partagés</h3>
          <ul>
            {actives.map((i) => (
              <li key={i.slug}>{i.inciName}</li>
            ))}
          </ul>
        </div>
      )}
      {alerts.length > 0 && (
        <div>
          <h3>Alertes</h3>
          <ul>
            {alerts.map((a) => (
              <li key={a.slug}>
                {a.inciName} — présent dans {a.presentIn.length}/{total}
              </li>
            ))}
          </ul>
        </div>
      )}
      {conflicts.length > 0 && (
        <div>
          <h3>Conflits</h3>
          <ul>
            {conflicts.map((c) => (
              <li key={`${c.a}-${c.b}`}>
                {c.a} + {c.b} — {c.note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
