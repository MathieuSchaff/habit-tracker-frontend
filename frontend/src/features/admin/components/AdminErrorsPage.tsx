import type { ErrorGroupStatus, ErrorSource } from '@aurore/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import { Fragment, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Time } from '@/component/DataDisplay/Time/Time'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { useConfirm } from '@/features/admin/useConfirm'
import { adminQueries, useResolveErrorGroup } from '@/lib/queries/admin'
import { adminLabels } from '../constants'
import { useSuccessFeedback } from '../useSuccessFeedback'
import { AdminFilterTabs } from './AdminFilterTabs'

const STATUS_TABS: ReadonlyArray<{ value: ErrorGroupStatus; label: string }> = [
  { value: 'open', label: 'Ouvertes' },
  { value: 'resolved', label: 'Résolues' },
]

const SOURCE_LABELS: Record<ErrorSource, string> = {
  backend: 'Backend',
  frontend: 'Frontend',
}

const SOURCE_FILTERS: ReadonlyArray<{ value: ErrorSource | 'all'; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'backend', label: SOURCE_LABELS.backend },
  { value: 'frontend', label: SOURCE_LABELS.frontend },
]

export function AdminErrorsPage() {
  const [status, setStatus] = useState<ErrorGroupStatus>('open')
  const [sourceFilter, setSourceFilter] = useState<ErrorSource | 'all'>('all')
  const source = sourceFilter === 'all' ? undefined : sourceFilter
  const { data } = useSuspenseQuery(adminQueries.errors(status, source))
  const resolve = useResolveErrorGroup()
  const { confirm, dialog } = useConfirm()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const { success, setSuccess } = useSuccessFeedback()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function handleToggleResolved(id: string, resolved: boolean) {
    const ok = await confirm({
      title: resolved ? 'Marquer comme résolue ?' : 'Rouvrir cette erreur ?',
      message: resolved
        ? 'Sort le groupe de la vue « Ouvertes ». Réversible.'
        : 'Replace le groupe dans la vue « Ouvertes ».',
      confirmLabel: resolved ? 'Résoudre' : 'Rouvrir',
    })
    if (!ok) return
    setPendingId(id)
    resolve.mutate(
      { id, body: { resolved } },
      {
        onSuccess: () => setSuccess(resolved ? 'Erreur résolue.' : 'Erreur rouverte.'),
        onSettled: () => setPendingId(null),
      }
    )
  }

  const items = data.items

  return (
    <section>
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Erreurs</h1>
          <p className="admin-page__lede">{items.length} groupe(s)</p>
        </div>
      </header>

      <AdminFilterTabs
        tabs={STATUS_TABS}
        value={status}
        onChange={setStatus}
        label="Filtrer par statut"
      />

      {/* Source is a filter group, not a tab interface (no tabpanel) → toggle buttons, not tablist. */}
      <div className="admin-filter-bar" role="toolbar" aria-label="Filtrer par source">
        {SOURCE_FILTERS.map((s) => (
          <button
            type="button"
            key={s.value}
            aria-pressed={sourceFilter === s.value}
            className={`admin-filter-bar__btn ${sourceFilter === s.value ? 'is-active' : ''}`}
            onClick={() => setSourceFilter(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-atomic="true">
        {success && <FormMessage variant="success">{success}</FormMessage>}
      </div>

      {items.length === 0 ? (
        <p className="admin-table__empty">{adminLabels.emptyErrors}</p>
      ) : (
        <table className="admin-table">
          <caption className="sr-only">Groupes d'erreurs de la production</caption>
          <thead>
            <tr>
              <th>Source</th>
              <th>Message</th>
              <th>Occur.</th>
              <th>Users</th>
              <th>Dernière</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((g) => {
              const isExpanded = expandedId === g.id
              const isResolved = g.resolvedAt !== null
              return (
                <Fragment key={g.id}>
                  <tr>
                    <td>
                      <span className={`admin-pill admin-pill--${g.source}`}>
                        {SOURCE_LABELS[g.source]}
                      </span>
                    </td>
                    <td>
                      <span className="admin-error-message">{g.message}</span>
                    </td>
                    <td>{g.count}</td>
                    <td>{g.affectedUsers}</td>
                    <td>
                      <Time iso={g.lastSeenAt} relative />
                    </td>
                    <td>
                      <div className="admin-actions-inline">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(isExpanded ? null : g.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? 'Replier' : 'Voir'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={pendingId === g.id && resolve.isPending}
                          onClick={() => handleToggleResolved(g.id, !isResolved)}
                        >
                          {isResolved ? 'Rouvrir' : 'Résoudre'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="admin-preview-cell">
                        <div className="admin-error-detail">
                          <p className="admin-reports-meta">
                            Première vue : <Time iso={g.firstSeenAt} relative /> · empreinte{' '}
                            <code className="admin-target-code">{g.fingerprint.slice(0, 12)}</code>
                          </p>
                          {g.stack && <pre className="admin-error-trace">{g.stack}</pre>}
                          {g.context != null && (
                            <pre className="admin-error-trace">
                              {JSON.stringify(g.context, null, 2)}
                            </pre>
                          )}
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
      {dialog}
    </section>
  )
}
