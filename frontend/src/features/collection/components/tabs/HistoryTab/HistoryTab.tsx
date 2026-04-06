import { History, MoreHorizontal } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { useClickOutside } from '@/hooks/useClickOutside'
import { useDeletePurchase } from '@/lib/queries/purchases'
import type { UserProduct } from '@/lib/queries/user-products'
import { AddPurchaseDialog } from '../CollectionTab/parts/AddPurchaseDialog'
import { DeleteConfirmDialog } from '../CollectionTab/parts/DeleteConfirmDialog'

import './HistoryTab.css'

interface HistoryTabProps {
  userProducts: UserProduct[]
}

type PurchaseEntry = {
  id: string
  userProductId: string
  purchasedAt: string | null
  pricePaidCents: number | null
  product: UserProduct['product']
}

function RowMenu({
  onEdit,
  onDelete,
  onClose,
}: {
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose)

  return (
    <div
      className="coll-hist-menu"
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className="coll-hist-menu-item"
        onClick={() => {
          onEdit()
          onClose()
        }}
      >
        Modifier
      </button>
      <button
        type="button"
        role="menuitem"
        className="coll-hist-menu-item coll-hist-menu-item--danger"
        onClick={() => {
          onDelete()
          onClose()
        }}
      >
        Supprimer
      </button>
    </div>
  )
}

export function HistoryTab({ userProducts }: HistoryTabProps) {
  const deletePurchaseMutation = useDeletePurchase()

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingPurchase, setEditingPurchase] = useState<PurchaseEntry | null>(null)
  const [deletingPurchase, setDeletingPurchase] = useState<PurchaseEntry | null>(null)

  const allPurchases: PurchaseEntry[] = useMemo(
    () =>
      userProducts
        .flatMap((up) =>
          (up.purchases ?? []).map((purchase) => ({
            ...purchase,
            product: up.product,
          }))
        )
        .sort((a, b) => {
          const dateA = a.purchasedAt ? new Date(a.purchasedAt).getTime() : 0
          const dateB = b.purchasedAt ? new Date(b.purchasedAt).getTime() : 0
          return dateB - dateA
        }),
    [userProducts]
  )

  if (allPurchases.length === 0) {
    return (
      <div className="coll-empty-state">
        <History size={44} className="coll-empty-icon" />
        <h3>Aucun achat enregistré</h3>
        <p>Vos achats apparaîtront ici dès que vous en ajouterez un.</p>
      </div>
    )
  }

  return (
    <div className="coll-history-view">
      <div className="coll-history-table">
        <div className="coll-history-head">
          <span>Date</span>
          <span>Produit</span>
          <span>Prix</span>
          <span>Actions</span>
        </div>

        {allPurchases.map((entry) => (
          <div key={entry.id} className="coll-history-row">
            <div className="coll-hist-row-top">
              <span className="coll-hist-date">
                {entry.purchasedAt ? new Date(entry.purchasedAt).toLocaleDateString() : '—'}
              </span>
              <div className="coll-hist-prod">
                <span className="coll-hist-name">{entry.product.name}</span>
                <span className="coll-hist-brand">{entry.product.brand}</span>
              </div>
            </div>

            <div className="coll-hist-row-bottom">
              <span className="coll-hist-price">
                {entry.pricePaidCents ? `${(entry.pricePaidCents / 100).toFixed(2)}€` : '—'}
              </span>

              <div className="coll-hist-actions">
                <button
                  type="button"
                  className="coll-hist-menu-btn"
                  aria-label="Options de l'achat"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpenId(menuOpenId === entry.id ? null : entry.id)
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>

                {menuOpenId === entry.id && (
                  <RowMenu
                    onEdit={() => setEditingPurchase(entry)}
                    onDelete={() => setDeletingPurchase(entry)}
                    onClose={() => setMenuOpenId(null)}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingPurchase && (
        <AddPurchaseDialog
          userProductId={editingPurchase.userProductId}
          purchase={{
            id: editingPurchase.id,
            purchasedAt: editingPurchase.purchasedAt ?? new Date().toISOString().split('T')[0],
            pricePaidCents: editingPurchase.pricePaidCents,
          }}
          onClose={() => setEditingPurchase(null)}
        />
      )}

      {deletingPurchase && (
        <DeleteConfirmDialog
          message={`Voulez-vous vraiment supprimer cet achat de ${deletingPurchase.product.name} ?`}
          confirmLabel="Supprimer"
          isPending={deletePurchaseMutation.isPending}
          onClose={() => setDeletingPurchase(null)}
          onConfirm={() =>
            deletePurchaseMutation.mutate(
              { userProductId: deletingPurchase.userProductId, purchaseId: deletingPurchase.id },
              { onSuccess: () => setDeletingPurchase(null) }
            )
          }
        />
      )}
    </div>
  )
}
