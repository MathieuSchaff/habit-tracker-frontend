import { Calendar, Euro, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { useClickOutside } from '@/hooks/useClickOutside'
import { useAddPurchase, useUpdatePurchase } from '@/lib/queries/purchases'

import './AddPurchaseDialog.css'

export interface PurchaseToEdit {
  id: string
  purchasedAt: string
  pricePaidCents: number | null
}

interface AddPurchaseDialogProps {
  userProductId: string
  purchase?: PurchaseToEdit
  onClose: () => void
}

export function AddPurchaseDialog({ userProductId, purchase, onClose }: AddPurchaseDialogProps) {
  const isEditMode = purchase !== undefined
  const addPurchaseMutation = useAddPurchase()
  const updatePurchaseMutation = useUpdatePurchase()
  const ref = useRef<HTMLDivElement>(null)

  const [purchaseDate, setPurchaseDate] = useState(
    () => purchase?.purchasedAt.split('T')[0] ?? new Date().toISOString().split('T')[0]
  )
  const [purchasePrice, setPurchasePrice] = useState(() =>
    purchase?.pricePaidCents != null ? (purchase.pricePaidCents / 100).toFixed(2) : ''
  )

  useClickOutside(ref, onClose)

  const isPending = addPurchaseMutation.isPending || updatePurchaseMutation.isPending

  const handleSave = (e: React.SubmitEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const pricePaidCents = purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) : null

    if (isEditMode) {
      updatePurchaseMutation.mutate(
        {
          userProductId,
          purchaseId: purchase.id,
          input: { purchasedAt: purchaseDate, pricePaidCents },
        },
        {
          onSuccess: () => {
            onClose()
            toast.success('Achat modifié !')
          },
          onError: () => {
            toast.error('Erreur lors de la modification')
          },
        }
      )
    } else {
      addPurchaseMutation.mutate(
        {
          userProductId,
          input: {
            purchasedAt: purchaseDate,
            pricePaidCents: pricePaidCents ?? undefined,
          },
        },
        {
          onSuccess: () => {
            onClose()
            toast.success('Achat enregistré !')
          },
          onError: () => {
            toast.error("Erreur lors de l'enregistrement")
          },
        }
      )
    }
  }

  return (
    <div className="apd-overlay">
      <div className="apd-dialog" role="dialog" aria-modal="true" ref={ref}>
        <div className="apd-header">
          <div className="apd-header-title">
            <Euro size={16} />
            <span className="apd-title">
              {isEditMode ? "MODIFIER L'ACHAT" : 'ENREGISTRER UN ACHAT'}
            </span>
          </div>
          <button type="button" className="apd-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="apd-form">
          <div className="apd-field">
            <label htmlFor="apd-date">
              <Calendar size={14} />
              Date d'achat
            </label>
            <input
              id="apd-date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />
          </div>

          <div className="apd-field">
            <label htmlFor="apd-price">
              <Euro size={14} />
              Prix payé (€)
            </label>
            <input
              id="apd-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
            />
          </div>

          <div className="apd-footer">
            <button type="button" className="apd-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="apd-submit" disabled={!purchaseDate || isPending}>
              {isPending ? '...' : 'Valider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
