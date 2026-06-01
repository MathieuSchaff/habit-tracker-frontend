import type { ReportStatus, ReportTargetType } from '@aurore/shared'

import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Time } from '@/component/DataDisplay/Time/Time'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { useConfirm } from '@/features/admin/useConfirm'
import { adminQueries, useModerateContent, useResolveReport } from '@/lib/queries/admin'
import { useAuthStore } from '@/store/auth'
import { adminLabels, roleLabels, rolePillClass } from '../constants'

const STATUSES: ReadonlyArray<{ value: ReportStatus; label: string }> = [
  { value: 'open', label: 'Ouverts' },
  { value: 'resolved', label: 'Résolus' },
  { value: 'dismissed', label: 'Rejetés' },
]

const SUCCESS_FEEDBACK_MS = 3500

const TARGET_TO_MODERATE: Record<
  Exclude<ReportTargetType, 'profile'>,
  'reviews' | 'threads' | 'replies' | 'products' | 'ingredients'
> = {
  review: 'reviews',
  thread: 'threads',
  reply: 'replies',
  product: 'products',
  ingredient: 'ingredients',
}

export function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus>('open')
  // Account-level surface: the users list (emails, roles, ban state) is admin-only.
  // A contributor (« modérateur ») gets a content-only queue — never account PII
  // (ADR-0006 S1). Gate both the fetch (enabled) and every render of derived data.
  const isAdmin = useAuthStore((s) => s.role === 'admin')
  const { data } = useSuspenseQuery(adminQueries.reports(status))
  const usersQuery = useQuery({ ...adminQueries.users(), enabled: isAdmin })
  const resolve = useResolveReport(status)
  const { confirm, dialog } = useConfirm()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(t)
  }, [success])

  const reporterEmailById = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of usersQuery.data?.items ?? []) map.set(u.id, u.email)
    return map
  }, [usersQuery.data])

  const userById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof usersQuery.data>['items'][number]>()
    for (const u of usersQuery.data?.items ?? []) map.set(u.id, u)
    return map
  }, [usersQuery.data])

  async function handleResolve(id: string, next: 'resolved' | 'dismissed') {
    const label = next === 'resolved' ? 'Résoudre' : 'Rejeter'
    const ok = await confirm({
      title: `${label} ce signalement ?`,
      message:
        next === 'resolved'
          ? 'Marque le signalement comme traité.'
          : 'Marque le signalement comme non recevable, sans action sur le contenu.',
      confirmLabel: label,
    })
    if (!ok) return
    setPendingId(id)
    resolve.mutate(
      { id, body: { status: next } },
      {
        onSuccess: () =>
          setSuccess(next === 'resolved' ? 'Signalement résolu.' : 'Signalement rejeté.'),
        onSettled: () => setPendingId(null),
      }
    )
  }

  const items = data.items

  return (
    <section>
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Signalements</h1>
          <p className="admin-page__lede">{items.length} entrée(s)</p>
        </div>
      </header>

      <div className="admin-filter-bar" role="tablist">
        {STATUSES.map((s) => (
          <button
            type="button"
            key={s.value}
            role="tab"
            aria-selected={status === s.value}
            className={`admin-filter-bar__btn ${status === s.value ? 'is-active' : ''}`}
            onClick={() => setStatus(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-atomic="true">
        {success && <FormMessage variant="success">{success}</FormMessage>}
      </div>

      {items.length === 0 ? (
        <p className="admin-table__empty">{adminLabels.emptyReports}</p>
      ) : (
        <table className="admin-table">
          <caption className="sr-only">Liste des signalements à modérer</caption>
          <thead>
            <tr>
              <th>Cible</th>
              <th>Raison</th>
              <th>Signalé par</th>
              <th>Signalé</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const isExpanded = expandedId === r.id
              const reporterEmail = reporterEmailById.get(r.reporterId) ?? null
              const canPreview = r.targetType !== 'profile'
              const targetUser =
                isAdmin && r.targetType === 'profile' ? userById.get(r.targetId) : null
              return (
                <>
                  <tr key={r.id}>
                    <td>
                      {targetUser ? (
                        <div className="admin-target-snapshot">
                          <span className="admin-target-snapshot__email">{targetUser.email}</span>
                          <span className="admin-target-snapshot__meta">
                            <span className={rolePillClass(targetUser.role)}>
                              {roleLabels[targetUser.role]}
                            </span>
                            {targetUser.forcedPrivateByAdmin && (
                              <span className="admin-pill admin-pill--banned">
                                {adminLabels.pillForced}
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <code className="admin-target-code">
                          {r.targetType}#{r.targetId.slice(0, 8)}
                        </code>
                      )}
                    </td>
                    <td>{r.reason}</td>
                    <td>{isAdmin ? (reporterEmail ?? <em>—</em>) : <em>—</em>}</td>
                    <td>
                      <Time iso={r.createdAt} relative />
                    </td>
                    <td>
                      <span className={`admin-pill admin-pill--${r.status}`}>{r.status}</span>
                    </td>
                    <td>
                      <div className="admin-actions-inline">
                        {canPreview && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedId(isExpanded ? null : r.id)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? 'Replier' : 'Voir'}
                          </Button>
                        )}
                        {isAdmin && r.targetType === 'profile' && (
                          <Link
                            to="/admin/users/$userId"
                            params={{ userId: r.targetId }}
                            className="admin-table__row-link"
                          >
                            Voir le profil
                          </Link>
                        )}
                        {r.status === 'open' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={pendingId === r.id && resolve.isPending}
                              onClick={() => handleResolve(r.id, 'resolved')}
                            >
                              Résoudre
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={pendingId === r.id && resolve.isPending}
                              onClick={() => handleResolve(r.id, 'dismissed')}
                            >
                              Rejeter
                            </Button>
                          </>
                        )}
                        {r.status !== 'open' && (
                          <em className="admin-reports-meta">
                            par {reporterEmailById.get(r.reviewedBy ?? '') ?? '—'}
                          </em>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && canPreview && (
                    <tr key={`${r.id}-preview`}>
                      <td colSpan={6} className="admin-preview-cell">
                        <ContentPreviewPanel
                          targetType={r.targetType as Exclude<ReportTargetType, 'profile'>}
                          targetId={r.targetId}
                        />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      )}
      {dialog}
    </section>
  )
}

function ContentPreviewPanel({
  targetType,
  targetId,
}: {
  targetType: Exclude<ReportTargetType, 'profile'>
  targetId: string
}) {
  const moderateTarget = TARGET_TO_MODERATE[targetType]
  const isAdmin = useAuthStore((s) => s.role === 'admin')
  const preview = useQuery(adminQueries.contentPreview(moderateTarget, targetId))
  const moderate = useModerateContent()
  const { confirm, dialog } = useConfirm()
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(t)
  }, [feedback])

  if (preview.isLoading) return <p className="admin-reports-meta">Chargement…</p>
  if (preview.isError || !preview.data) {
    return (
      <p className="admin-reports-meta">Contenu introuvable (peut-être supprimé par son auteur).</p>
    )
  }

  const data = preview.data
  const isHidden = data.moderationStatus === 'hidden'

  async function toggleVisibility() {
    const next = isHidden ? 'visible' : 'hidden'
    const ok = await confirm({
      title: next === 'hidden' ? 'Masquer ce contenu ?' : 'Restaurer ce contenu ?',
      message:
        next === 'hidden'
          ? 'Le contenu disparaît des lectures publiques. Action réversible.'
          : 'Le contenu redevient visible publiquement.',
      confirmLabel: next === 'hidden' ? 'Masquer' : 'Restaurer',
      variant: next === 'hidden' ? 'danger' : 'default',
    })
    if (!ok) return
    moderate.mutate(
      { target: moderateTarget, id: targetId, body: { status: next } },
      {
        onSuccess: () => setFeedback(next === 'hidden' ? 'Contenu masqué.' : 'Contenu restauré.'),
      }
    )
  }

  return (
    <div className="admin-preview">
      <header className="admin-preview__meta">
        <span className={`admin-pill admin-pill--${isHidden ? 'banned' : 'resolved'}`}>
          {data.moderationStatus}
        </span>
        <span className="admin-reports-meta">
          par {data.authorUsername ?? '—'} · <Time iso={data.createdAt} relative />
        </span>
      </header>
      <div className="admin-preview__body">
        {data.kind === 'review' && (data.comment ?? <em>(commentaire vide)</em>)}
        {data.kind === 'thread' && (
          <>
            <strong>{data.title}</strong>
            <p>{data.content}</p>
          </>
        )}
        {data.kind === 'reply' && <p>{data.content}</p>}
        {data.kind === 'product' && (
          <>
            <strong>{data.name}</strong>
            <p>{data.brand}</p>
          </>
        )}
        {data.kind === 'ingredient' && <strong>{data.name}</strong>}
      </div>
      {data.moderationReason && (
        <p className="admin-reports-meta">Raison admin : {data.moderationReason}</p>
      )}
      <div className="admin-actions-inline">
        <Button variant="ghost" size="sm" loading={moderate.isPending} onClick={toggleVisibility}>
          {isHidden ? 'Restaurer' : 'Masquer'}
        </Button>
        {isAdmin && data.authorId && (
          <Link
            to="/admin/users/$userId"
            params={{ userId: data.authorId }}
            className="admin-table__row-link"
          >
            Bannir cet auteur
          </Link>
        )}
      </div>
      <div aria-live="polite" aria-atomic="true">
        {feedback && <FormMessage variant="success">{feedback}</FormMessage>}
      </div>
      {dialog}
    </div>
  )
}
