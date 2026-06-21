import type { SuggestedEditStatus } from '@aurore/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { adminQueries, useReviewSuggestedEdit } from '@/lib/queries/admin'
import { adminLabels } from '../constants'
import { useConfirm } from '../useConfirm'
import { useSuccessFeedback } from '../useSuccessFeedback'
import { AdminFilterTabs } from './AdminFilterTabs'

const STATUSES: { value: SuggestedEditStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'accepted', label: 'Acceptées' },
  { value: 'rejected', label: 'Refusées' },
]

export function AdminSuggestedEditsPage() {
  const [status, setStatus] = useState<SuggestedEditStatus>('pending')
  const { data } = useSuspenseQuery(adminQueries.suggestedEdits(status))
  const review = useReviewSuggestedEdit(status)
  const { confirm, dialog } = useConfirm()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const { success, setSuccess } = useSuccessFeedback()

  async function handleReview(id: string, next: 'accepted' | 'rejected') {
    const ok = await confirm({
      title: next === 'accepted' ? 'Accepter cette correction ?' : 'Refuser cette correction ?',
      message:
        next === 'accepted'
          ? 'La valeur proposée sera appliquée à la fiche.'
          : 'La fiche reste inchangée.',
      confirmLabel: next === 'accepted' ? 'Accepter' : 'Refuser',
    })
    if (!ok) return
    setPendingId(id)
    review.mutate(
      { id, body: { status: next } },
      {
        onSuccess: () =>
          setSuccess(next === 'accepted' ? 'Correction appliquée.' : 'Correction refusée.'),
        onSettled: () => setPendingId(null),
      }
    )
  }

  return (
    <section>
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">{adminLabels.navSuggestedEdits}</h1>
          <p className="admin-page__lede">{data.items.length} entrée(s)</p>
        </div>
      </header>

      <AdminFilterTabs tabs={STATUSES} value={status} onChange={setStatus} />

      <div aria-live="polite" aria-atomic="true">
        {success && <FormMessage variant="success">{success}</FormMessage>}
      </div>

      {data.items.length === 0 ? (
        <p className="admin-table__empty">{adminLabels.emptySuggestedEdits}</p>
      ) : (
        <table className="admin-table">
          <caption className="sr-only">Corrections proposées</caption>
          <thead>
            <tr>
              <th>Cible</th>
              <th>Champ</th>
              <th>Valeur proposée</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((e) => (
              <tr key={e.id}>
                <td>
                  <code className="admin-target-code">
                    {e.targetType}#{e.targetId.slice(0, 8)}
                  </code>
                </td>
                <td>{e.field}</td>
                <td>{e.proposedValue}</td>
                <td>
                  <span className="admin-pill">{e.status}</span>
                </td>
                <td>
                  {e.status === 'pending' && (
                    <div className="admin-actions-inline">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={pendingId === e.id && review.isPending}
                        onClick={() => handleReview(e.id, 'accepted')}
                      >
                        Accepter
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={pendingId === e.id && review.isPending}
                        onClick={() => handleReview(e.id, 'rejected')}
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
