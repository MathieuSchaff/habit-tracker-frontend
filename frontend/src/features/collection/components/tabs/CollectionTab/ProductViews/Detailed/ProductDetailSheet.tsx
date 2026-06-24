import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, FlaskConical, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { ButtonLink } from '@/component/Button/Button'
import { Sheet } from '@/component/Dialog/Sheet'
import { pdsLabels } from '@/features/collection/constants'
import { useAnnounce } from '@/hooks/useAnnounce'
import { purchaseQueries } from '@/lib/queries/purchases'
import type { UserProduct } from '@/lib/queries/user-products'
import { useDeleteUserProduct, useUpdateUserProduct } from '@/lib/queries/user-products'
import { AddPurchaseDialog } from '../../parts/AddPurchaseDialog'
import { DeleteConfirmDialog } from '../../parts/DeleteConfirmDialog'
import { LifecycleSection } from './LifecycleSection'
import { PdsAccordion } from './PdsAccordion'
import { PdsDecisionSection } from './PdsDecisionSection'
import { PdsExperienceSection } from './PdsExperienceSection'
import { PdsFormulaSection } from './PdsFormulaSection'
import { PdsHero } from './PdsHero'
import { useStatusDecision } from './useStatusDecision'

import './ProductDetailSheet.css'

interface ProductDetailSheetProps {
  p: UserProduct
  onClose: () => void
}

export function ProductDetailSheet({ p, onClose }: ProductDetailSheetProps) {
  const updateMutation = useUpdateUserProduct()
  const deleteMutation = useDeleteUserProduct()
  const announce = useAnnounce()

  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const [showAddPurchase, setShowAddPurchase] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const decision = useStatusDecision(p, (status, reason) =>
    updateMutation.mutate({ id: p.id, input: { status, ...(reason ? { reason } : {}) } })
  )

  const { data: purchases } = useQuery(purchaseQueries.byUserProduct(p.id))
  const purchaseCount = purchases?.length ?? 0

  return (
    <>
      <Sheet
        onClose={onClose}
        initialFocusRef={closeBtnRef}
        className="pds-sheet coll-product-sheet"
      >
        <PdsHero
          p={p}
          closeBtnRef={closeBtnRef}
          onClose={onClose}
          onStatusChange={decision.handleStatusChange}
        />

        <div className="pds-scroll">
          <PdsFormulaSection p={p} />

          {/* §5 Mon expérience */}
          <PdsExperienceSection p={p} updateMutation={updateMutation} />

          {/* §6 Ma décision */}
          <PdsDecisionSection
            p={p}
            decision={decision}
            isUpdatePending={updateMutation.isPending}
          />

          {/* §8 Cycle de vie */}
          <PdsAccordion
            icon={<FlaskConical size={14} />}
            title={pdsLabels.lifecycle}
            badge={
              purchaseCount > 0
                ? `${purchaseCount} ${purchaseCount > 1 ? 'achats' : 'achat'}`
                : undefined
            }
          >
            <LifecycleSection p={p} onAddPurchase={() => setShowAddPurchase(true)} />
          </PdsAccordion>

          {/* §7 Comparer */}
          <PdsAccordion icon={<ArrowLeftRight size={14} />} title="Comparer">
            <p className="pds-section-lead">
              Comparez les groupes d'ingrédients et vos notes personnelles côte à côte.
            </p>
            <ButtonLink
              to="/products/compare/new"
              search={{ seed: p.productId }}
              variant="outline"
              size="sm"
              className="pds-compare-btn"
            >
              <ArrowLeftRight size={14} aria-hidden="true" />
              <span>Choisir un produit à comparer</span>
            </ButtonLink>
          </PdsAccordion>

          <footer className="pds-footer">
            <button
              type="button"
              className="pds-remove-btn"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label={`Retirer ${p.product.name} de ma collection`}
            >
              <Trash2 size={13} aria-hidden="true" />
              <span>Retirer de ma collection</span>
            </button>
          </footer>
        </div>
      </Sheet>

      {showAddPurchase && (
        <AddPurchaseDialog userProductId={p.id} onClose={() => setShowAddPurchase(false)} />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmDialog
          title="Retirer ce produit ?"
          message="Retirer supprime aussi vos notes et votre historique pour ce produit. Si vous voulez juste ne plus l'utiliser, vous pouvez le marquer À éviter — vos notes restent disponibles."
          confirmLabel="Retirer définitivement"
          onConfirm={() =>
            deleteMutation.mutate(p.id, {
              onSuccess: () => {
                announce('Produit retiré de votre collection')
                onClose()
              },
            })
          }
          onClose={() => setShowDeleteConfirm(false)}
          isPending={deleteMutation.isPending}
          onAvoid={
            p.status === 'avoided'
              ? undefined
              : () =>
                  updateMutation.mutate(
                    { id: p.id, input: { status: 'avoided' } },
                    {
                      onSuccess: () => {
                        announce('Produit marqué à éviter')
                        onClose()
                      },
                    }
                  )
          }
          avoidPending={updateMutation.isPending}
        />
      )}
    </>
  )
}
