import type { SecuritySeverity } from '@aurore/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Fragment, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Time } from '@/component/DataDisplay/Time/Time'
import { adminQueries } from '@/lib/queries/admin'
import { adminLabels } from '../constants'

type SeverityTab = SeverityFilter['value']
type SeverityFilter = { value: 'all' | SecuritySeverity; label: string }

const SEVERITY_TABS: ReadonlyArray<SeverityFilter> = [
  { value: 'all', label: 'Tous' },
  { value: 'high', label: 'Élevée' },
  { value: 'low', label: 'Basse' },
]

const SEVERITY_LABELS: Record<SecuritySeverity, string> = {
  high: 'Élevée',
  low: 'Basse',
}

export function AdminSecurityEventsPage() {
  const [tab, setTab] = useState<SeverityTab>('all')
  const severity = tab === 'all' ? undefined : tab
  const { data } = useSuspenseQuery(adminQueries.securityEvents(severity))
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const items = data.items

  return (
    <section>
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Sécurité</h1>
          {/* "récent(s)" — the list is the N most recent (server caps at 200), not an exhaustive total. */}
          <p className="admin-page__lede">
            {items.length} événement(s) récent(s)
            {tab !== 'all' ? ` · ${SEVERITY_LABELS[tab]}` : ''}
          </p>
        </div>
      </header>

      <div className="admin-filter-bar" role="tablist" aria-label="Filtrer par sévérité">
        {SEVERITY_TABS.map((t) => (
          <button
            type="button"
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            className={`admin-filter-bar__btn ${tab === t.value ? 'is-active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="admin-table__empty">{adminLabels.emptySecurityEvents}</p>
      ) : (
        <table className="admin-table">
          <caption className="sr-only">Événements de sécurité (hits des gardes d'entrée)</caption>
          <thead>
            <tr>
              <th>Sévérité</th>
              <th>Type</th>
              <th>Champ</th>
              <th>Route</th>
              <th>Quand</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => {
              const isExpanded = expandedId === e.id
              return (
                <Fragment key={e.id}>
                  <tr>
                    <td>
                      <span className={`admin-pill admin-pill--${e.severity}`}>
                        {SEVERITY_LABELS[e.severity]}
                      </span>
                    </td>
                    <td>
                      <code className="admin-target-code">{e.eventType}</code>
                    </td>
                    <td>{e.field}</td>
                    <td>
                      <code className="admin-target-code">{e.route}</code>
                    </td>
                    <td>
                      <Time iso={e.createdAt} relative />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : e.id)}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? 'Replier' : 'Voir'}
                      </Button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="admin-preview-cell">
                        <div className="admin-error-detail">
                          <p className="admin-reports-meta">
                            Utilisateur{' '}
                            <Link
                              to="/admin/users/$userId"
                              params={{ userId: e.userId }}
                              className="admin-table__row-link"
                            >
                              {e.userId.slice(0, 8)}
                            </Link>
                          </p>
                          <pre className="admin-error-trace">{e.payload}</pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
