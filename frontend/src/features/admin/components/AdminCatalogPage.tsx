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
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), SUCCESS_FEEDBACK_MS)
    return () => clearTimeout(t)
  }, [success])

  const moderateTarget = kind === 'product' ? 'products' : 'ingredients'

  async function handleVerify(id: string, name: string) {
    const ok = await confirm({
      title: 'Marquer comme vérifiée ?',
      message: `« ${name} » portera le marqueur « Vérifiée ». Action définitive.`,
      confirmLabel: 'Vérifier',
    })
    if (!ok) return
    setPendingId(id)
    verify.mutate(
      { kind, id },
      { onSuccess: () => setSuccess('Fiche vérifiée.'), onSettled: () => setPendingId(null) }
    )
  }

  async function handleHide(id: string, name: string, hidden: boolean) {
    const next = hidden ? 'visible' : 'hidden'
    const ok = await confirm({
      title: next === 'hidden' ? 'Masquer cette fiche ?' : 'Restaurer cette fiche ?',
      message:
        next === 'hidden'
          ? `« ${name} » disparaît des lectures publiques. Action réversible.`
          : `« ${name} » redevient visible publiquement.`,
      confirmLabel: next === 'hidden' ? 'Masquer' : 'Restaurer',
      variant: next === 'hidden' ? 'danger' : 'default',
    })
    if (!ok) return
    setPendingId(id)
    moderate.mutate(
      { target: moderateTarget, id, body: { status: next } },
      {
        onSuccess: () => setSuccess(next === 'hidden' ? 'Fiche masquée.' : 'Fiche restaurée.'),
        onSettled: () => setPendingId(null),
      }
    )
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
            onClick={() => setKind(k.value)}
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
            onClick={() => setView(v.value)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-atomic="true">
        {success && <FormMessage variant="success">{success}</FormMessage>}
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
              const busy = pendingId === item.id
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
                          loading={busy && verify.isPending}
                          onClick={() => handleVerify(item.id, item.name)}
                        >
                          Vérifier
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={busy && moderate.isPending}
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
