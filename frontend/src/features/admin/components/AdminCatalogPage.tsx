import type { CatalogKind } from '@aurore/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Time } from '@/component/DataDisplay/Time/Time'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { useConfirm } from '@/features/admin/useConfirm'
import { adminQueries, useModerateContent, useVerifyCatalogItem } from '@/lib/queries/admin'
import { adminLabels } from '../constants'

const SUCCESS_FEEDBACK_MS = 3500
const ACTION_FAILED = 'L’action a échoué. Réessayez.'

type View = 'to-verify' | 'hidden'

const KINDS: ReadonlyArray<{ value: CatalogKind; label: string }> = [
  { value: 'product', label: 'Produits' },
  { value: 'ingredient', label: 'Ingrédients' },
]
const VIEWS: ReadonlyArray<{ value: View; label: string }> = [
  { value: 'to-verify', label: 'À vérifier' },
  { value: 'hidden', label: 'Masqués' },
]

export function AdminCatalogPage() {
  const [kind, setKind] = useState<CatalogKind>('product')
  const [view, setView] = useState<View>('to-verify')
  const quality = view === 'to-verify' ? 'unverified' : undefined
  const status = view === 'to-verify' ? 'visible' : 'hidden'
  const { data } = useSuspenseQuery(adminQueries.catalogQueue(kind, quality, status))
  const verify = useVerifyCatalogItem()
  const moderate = useModerateContent()
  const { confirm, dialog } = useConfirm()
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(t)
  }, [success])

  const moderateTarget = kind === 'product' ? 'products' : 'ingredients'

  // Tab switches drop stale feedback so a banner can't bleed into the next view's context.
  function changeKind(next: CatalogKind) {
    setSuccess(null)
    setError(null)
    setKind(next)
  }
  function changeView(next: View) {
    setSuccess(null)
    setError(null)
    setView(next)
  }

  function submitModeration(id: string, next: 'visible' | 'hidden', reason?: string) {
    setError(null)
    setSuccess(null)
    moderate.mutate(
      { target: moderateTarget, id, body: reason ? { status: next, reason } : { status: next } },
      {
        onSuccess: () => setSuccess(next === 'hidden' ? 'Fiche masquée.' : 'Fiche restaurée.'),
        onError: () => setError(ACTION_FAILED),
      }
    )
  }

  async function handleVerify(id: string, name: string) {
    const ok = await confirm({
      title: 'Marquer comme vérifiée ?',
      message: `« ${name} » portera le marqueur « Vérifiée ». Action définitive.`,
      confirmLabel: 'Vérifier',
    })
    if (!ok) return
    setError(null)
    setSuccess(null)
    verify.mutate(
      { kind, id },
      {
        onSuccess: () => setSuccess('Fiche vérifiée.'),
        onError: () => setError(ACTION_FAILED),
      }
    )
  }

  async function handleHide(id: string, name: string, hidden: boolean) {
    if (hidden) {
      const ok = await confirm({
        title: 'Restaurer cette fiche ?',
        message: `« ${name} » redevient visible publiquement.`,
        confirmLabel: 'Restaurer',
      })
      if (!ok) return
      submitModeration(id, 'visible')
      return
    }
    const { confirmed, reason } = await confirm({
      title: 'Masquer cette fiche ?',
      message: `« ${name} » disparaît des lectures publiques. Action réversible.`,
      confirmLabel: 'Masquer',
      variant: 'danger',
      reason: {
        label: 'Note du modérateur',
        placeholder: 'Expliquez à l’auteur pourquoi (optionnel).',
      },
    })
    if (!confirmed) return
    submitModeration(id, 'hidden', reason || undefined)
  }

  const items = data.items

  return (
    <section>
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Modération catalogue</h1>
          <p className="admin-page__lede">{items.length} fiche(s)</p>
        </div>
      </header>

      <div className="admin-filter-bar" role="tablist" aria-label="Type de fiche">
        {KINDS.map((k) => (
          <button
            type="button"
            key={k.value}
            role="tab"
            aria-selected={kind === k.value}
            className={`admin-filter-bar__btn ${kind === k.value ? 'is-active' : ''}`}
            onClick={() => changeKind(k.value)}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="admin-filter-bar" role="tablist" aria-label="Vue">
        {VIEWS.map((v) => (
          <button
            type="button"
            key={v.value}
            role="tab"
            aria-selected={view === v.value}
            className={`admin-filter-bar__btn ${view === v.value ? 'is-active' : ''}`}
            onClick={() => changeView(v.value)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-atomic="true">
        {success && <FormMessage variant="success">{success}</FormMessage>}
        {error && <FormMessage variant="error">{error}</FormMessage>}
      </div>

      {items.length === 0 ? (
        <p className="admin-table__empty">{adminLabels.emptyCatalogQueue}</p>
      ) : (
        <table className="admin-table">
          <caption className="sr-only">Fiches catalogue à modérer</caption>
          <thead>
            <tr>
              <th>Fiche</th>
              <th>Qualité</th>
              <th>Auteur</th>
              <th>Soumis</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isHidden = item.moderationStatus === 'hidden'
              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.brand && <span className="admin-reports-meta"> · {item.brand}</span>}
                  </td>
                  <td>
                    <span className={`admin-pill admin-pill--${item.catalogQuality}`}>
                      {item.catalogQuality === 'verified' ? 'Vérifiée' : 'Non vérifiée'}
                    </span>
                  </td>
                  <td>
                    <code className="admin-target-code">{item.authorId?.slice(0, 8) ?? '—'}</code>
                  </td>
                  <td>
                    <Time iso={item.createdAt} relative />
                  </td>
                  <td>
                    <div className="admin-actions-inline">
                      {item.catalogQuality === 'unverified' && !isHidden && (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={verify.isPending && verify.variables?.id === item.id}
                          onClick={() => handleVerify(item.id, item.name)}
                        >
                          Vérifier
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={moderate.isPending && moderate.variables?.id === item.id}
                        onClick={() => handleHide(item.id, item.name, isHidden)}
                      >
                        {isHidden ? 'Restaurer' : 'Masquer'}
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {dialog}
    </section>
  )
}
