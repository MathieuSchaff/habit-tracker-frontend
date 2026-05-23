import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { AlertTriangle, Sparkle, Zap } from 'lucide-react'
import type { ReactNode } from 'react'

import { IconBox } from '@/component/Layout/IconBox/IconBox'
import { computeAlerts, computeConflicts, computeSharedActives } from '../helpers/aggregations'
import './SignalsSection.css'

type Props = { products: EnrichedComparisonProduct[] }

export const SIGNALS_LABELS = {
  sharedActives: 'Actifs partagés',
} as const

type CardProps = {
  tone: 'actives' | 'alerts' | 'conflicts'
  title: string
  hint: string
  count: number
  icon: ReactNode
  children: ReactNode
}

function SignalCard({ tone, title, hint, count, icon, children }: CardProps) {
  return (
    <article className={`signals-card signals-card--${tone}`}>
      <header className="signals-card__head">
        <IconBox className="signals-card__seal">{icon}</IconBox>
        <div className="signals-card__title-block">
          <h3 className="signals-card__title">{title}</h3>
          <p className="signals-card__hint">{hint}</p>
        </div>
        <span className="signals-card__count">{count}</span>
      </header>
      {children}
    </article>
  )
}

export function SignalsSection({ products }: Props) {
  const actives = computeSharedActives(products)
  const alerts = computeAlerts(products)
  const conflicts = computeConflicts(products)
  const total = products.length

  if (actives.length === 0 && alerts.length === 0 && conflicts.length === 0) {
    return (
      <section className="signals-section">
        <h2 className="signals-section__title">Signaux</h2>
        <p className="signals-section__none">Aucun signal à signaler.</p>
      </section>
    )
  }

  return (
    <section className="signals-section">
      <h2 className="signals-section__title">Signaux</h2>
      <div className="signals-section__groups">
        {actives.length > 0 && (
          <SignalCard
            tone="actives"
            title={SIGNALS_LABELS.sharedActives}
            hint="Présents dans toutes les formules"
            count={actives.length}
            icon={<Sparkle size={16} aria-hidden="true" />}
          >
            <ul className="signals-card__items">
              {actives.map((i) => (
                <li key={i.slug} className="signals-pill signals-pill--active">
                  {i.inciName}
                </li>
              ))}
            </ul>
          </SignalCard>
        )}

        {alerts.length > 0 && (
          <SignalCard
            tone="alerts"
            title="Vigilances"
            hint="Allergènes ou sensibilisants potentiels"
            count={alerts.length}
            icon={<AlertTriangle size={16} aria-hidden="true" />}
          >
            <ul className="signals-card__items">
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
          </SignalCard>
        )}

        {conflicts.length > 0 && (
          <SignalCard
            tone="conflicts"
            title="Conflits d'usage"
            hint="À ne pas appliquer simultanément"
            count={conflicts.length}
            icon={<Zap size={16} aria-hidden="true" />}
          >
            <ul className="signals-card__items">
              {conflicts.map((c) => (
                <li key={`${c.a}-${c.b}`} className="signals-pill signals-pill--conflict">
                  {c.a} <span aria-hidden="true">↔</span> {c.b}
                  {c.note && <span className="signals-pill__detail"> — {c.note}</span>}
                </li>
              ))}
            </ul>
          </SignalCard>
        )}
      </div>
    </section>
  )
}
