import { Calendar, Euro, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/component/Button/Button'
import { Modal } from '@/component/Dialog/Modal'
import { Input } from '@/component/Input/Input'
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

  const [purchaseDate, setPurchaseDate] = useState(
    () => purchase?.purchasedAt.split('T')[0] ?? new Date().toISOString().split('T')[0]
  )
  const [purchasePrice, setPurchasePrice] = useState(() =>
    purchase?.pricePaidCents != null ? (purchase.pricePaidCents / 100).toFixed(2) : ''
  )

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
    <Modal onClose={onClose} className="apd-dialog">
      <div className="apd-header">
        <div className="apd-header-title">
          <Euro size={16} />
          <Modal.Title className="apd-title">
            {isEditMode ? "MODIFIER L'ACHAT" : 'ENREGISTRER UN ACHAT'}
          </Modal.Title>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </Button>
      </div>

      <form onSubmit={handleSave} className="apd-form">
        <div className="apd-field">
          <label htmlFor="apd-date">
            <Calendar size={14} />
            Date d'achat
          </label>
          <Input
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
          <Input
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
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={!purchaseDate || isPending} loading={isPending}>
            Valider
          </Button>
        </div>
      </form>
    </Modal>
  )
}
