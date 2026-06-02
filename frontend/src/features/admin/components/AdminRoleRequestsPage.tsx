import type { RoleRequestStatus } from '@aurore/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Time } from '@/component/DataDisplay/Time/Time'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { adminQueries, useReviewRoleRequest } from '@/lib/queries/admin'
import { adminLabels, getAdminErrorMessage, roleRequestStatusLabels } from '../constants'
import { useConfirm } from '../useConfirm'

const SUCCESS_FEEDBACK_MS = 3500

const STATUSES: { value: RoleRequestStatus; label: string }[] = [
  { value: 'pending', label: roleRequestStatusLabels.pending },
  { value: 'approved', label: roleRequestStatusLabels.approved },
  { value: 'rejected', label: roleRequestStatusLabels.rejected },
  { value: 'cancelled', label: roleRequestStatusLabels.cancelled },
]

export function AdminRoleRequestsPage() {
  const [status, setStatus] = useState<RoleRequestStatus>('pending')
  const { data } = useSuspenseQuery(adminQueries.roleRequests(status))
  const review = useReviewRoleRequest()
  const { confirm, dialog } = useConfirm()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(t)
  }, [success])

  async function handleApprove(id: string) {
    const ok = await confirm({
      title: 'Approuver cette demande ?',
      message: 'Le compte deviendra modérateur immédiatement.',
      confirmLabel: 'Approuver',
    })
    if (!ok) return
    setPendingId(id)
    review.mutate(
      { id, body: { decision: 'approve' } },
      {
        onSuccess: () => setSuccess('Demande approuvée. Le compte est désormais modérateur.'),
        onSettled: () => setPendingId(null),
      }
    )
  }

  async function handleReject(id: string) {
    // reason is required server-side (1-500); the dialog blocks confirm until it's filled.
    const result = await confirm({
      title: 'Refuser cette demande ?',
      variant: 'danger',
      confirmLabel: 'Refuser',
      reason: {
        label: 'Raison du refus',
        hint: 'Visible par le demandeur (1 à 500 caractères).',
        required: true,
        maxLength: 500,
      },
    })
    if (!result.confirmed) return
    setPendingId(id)
    review.mutate(
      { id, body: { decision: 'reject', reason: result.reason } },
      {
        onSuccess: () => setSuccess('Demande refusée.'),
        onSettled: () => setPendingId(null),
      }
    )
  }

  return (
    <section>
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">{adminLabels.navRoleRequests}</h1>
          <p className="admin-page__lede">{data.items.length} demande(s)</p>
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
            onClick={() => {
              // Drop any feedback from the previous tab so it doesn't linger over a fresh view.
              setStatus(s.value)
              setSuccess(null)
              review.reset()
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-atomic="true">
        {success && <FormMessage variant="success">{success}</FormMessage>}
        {review.isError && (
          <FormMessage variant="error">{getAdminErrorMessage(review.error)}</FormMessage>
        )}
      </div>

      {data.items.length === 0 ? (
        <p className="admin-table__empty">{adminLabels.emptyRoleRequests}</p>
      ) : (
        <table className="admin-table">
          <caption className="sr-only">Demandes de rôle modérateur</caption>
          <thead>
            <tr>
              <th>Demandeur</th>
              <th>Motivation</th>
              <th>Lien</th>
              <th>Date</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id}>
                <td>
                  <code className="admin-target-code">{r.userId.slice(0, 8)}</code>
                </td>
                <td>{r.motivation}</td>
                <td>
                  {r.motivationLink ? (
                    <a href={r.motivationLink} target="_blank" rel="noreferrer noopener">
                      Lien
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <Time iso={r.createdAt} relative />
                </td>
                <td>
                  <span className="admin-pill">{roleRequestStatusLabels[r.status]}</span>
                </td>
                <td>
                  {r.status === 'pending' && (
                    <div className="admin-actions-inline">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={pendingId === r.id && review.isPending}
                        onClick={() => handleApprove(r.id)}
                      >
                        Approuver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={pendingId === r.id && review.isPending}
                        onClick={() => handleReject(r.id)}
                      >
                        Refuser
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {dialog}
    </section>
  )
}
