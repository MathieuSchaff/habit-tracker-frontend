import { History, MoreHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DropdownMenu } from '@/component/DropdownMenu/DropdownMenu'
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

export function HistoryTab({ userProducts }: HistoryTabProps) {
  const deletePurchaseMutation = useDeletePurchase()

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
      <table className="coll-history-table" aria-label="Historique des achats">
        <thead className="coll-history-head">
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Produit</th>
            <th scope="col">Prix</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {allPurchases.map((entry) => (
            <tr key={entry.id} className="coll-history-row">
              <td className="coll-hist-date">
                {entry.purchasedAt ? new Date(entry.purchasedAt).toLocaleDateString() : '—'}
              </td>
              <td className="coll-hist-prod">
                <span className="coll-hist-name">{entry.product.name}</span>
                <span className="coll-hist-brand">{entry.product.brand}</span>
              </td>
              <td className="coll-hist-price">
                {entry.pricePaidCents ? `${(entry.pricePaidCents / 100).toFixed(2)}€` : '—'}
              </td>
              <td className="coll-hist-actions">
                <DropdownMenu>
                  <DropdownMenu.Trigger>
                    <button
                      type="button"
                      className="coll-hist-menu-btn"
                      aria-label={`Options pour l'achat de ${entry.product.name}`}
                    >
                      <MoreHorizontal size={16} aria-hidden="true" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item index={0} onSelect={() => setEditingPurchase(entry)}>
                      <button type="button">Modifier</button>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      index={1}
                      variant="danger"
                      onSelect={() => setDeletingPurchase(entry)}
                    >
                      <button type="button">Supprimer</button>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
