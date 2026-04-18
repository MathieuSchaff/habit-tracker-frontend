import type { UserProductStatus } from '@habit-tracker/shared'

import { ArrowLeft, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Modal } from '@/component/Dialog/Modal'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { Input } from '@/component/Input/Input'
import { useAddPurchase } from '../../../../lib/queries/purchases'
import { useCreateUserProduct } from '../../../../lib/queries/user-products'
import './AddToCollectionModal.css'

interface ModalProduct {
  id: string
  name: string
  brand: string
  priceCents?: number | null
  userProductId?: string
}

interface AddToCollectionModalProps {
  product: ModalProduct
  onClose: () => void
  onSuccess?: () => void
}

// 'archived' is excluded: users cannot directly add a product as archived
const STATUS_OPTIONS: { value: UserProductStatus; label: string }[] = [
  { value: 'in_stock', label: 'En stock' },
  { value: 'wishlist', label: 'Liste de souhaits' },
  { value: 'watched', label: 'Surveillé' },
  { value: 'holy_grail', label: 'Saint Graal' },
  { value: 'avoided', label: 'Évité' },
]

export function AddToCollectionModal({ product, onClose, onSuccess }: AddToCollectionModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const defaultPrice = product.priceCents != null ? (product.priceCents / 100).toFixed(2) : ''

  const [step, setStep] = useState<'status' | 'purchase'>('status')
  const [price, setPrice] = useState(defaultPrice)
  const [purchasedAt, setPurchasedAt] = useState(today)

  const addUserProduct = useCreateUserProduct()
  const addPurchase = useAddPurchase()

  const isPending = addUserProduct.isPending || addPurchase.isPending
  const isError = addUserProduct.isError || addPurchase.isError

  const handleStatusSelect = async (status: UserProductStatus) => {
    if (status === 'in_stock') {
      setStep('purchase')
      return
    }
    try {
      await addUserProduct.mutateAsync({ productId: product.id, status })
      onSuccess?.()
      onClose()
    } catch {
      // error handled via mutation state
    }
  }

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pricePaidCents = price !== '' ? Math.round(parseFloat(price) * 100) : undefined
    try {
      let userProductId = product.userProductId
      if (!userProductId) {
        const created = await addUserProduct.mutateAsync({
          productId: product.id,
          status: 'in_stock',
        })
        userProductId = created.id
      }
      await addPurchase.mutateAsync({
        userProductId,
        input: { purchasedAt, pricePaidCents },
      })
      onSuccess?.()
      onClose()
    } catch {
      // error handled via mutation state
    }
  }

  const title = step === 'status' ? 'Ajouter à la collection' : 'Achat'

  return (
    <Modal onClose={onClose} className="inv-modal-dialog">
      <div className="inv-modal-header">
        <div>
          <Modal.Title className="inv-modal-title">{title}</Modal.Title>
          <p className="inv-modal-subtitle">
            {product.name} · {product.brand}
          </p>
        </div>
        <button type="button" className="inv-modal-close-btn" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>
      </div>

      {step === 'status' && (
        <>
          {addUserProduct.isError && (
            <div className="inv-modal-error-wrapper">
              <FormMessage variant="error">Erreur lors de l'ajout. Veuillez réessayer.</FormMessage>
            </div>
          )}
          <div className="inv-modal-status-grid">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`inv-modal-status-btn${value === 'in_stock' ? ' inv-modal-status-btn--in-stock' : ''}`}
                onClick={() => handleStatusSelect(value)}
                disabled={isPending}
              >
                <span className="inv-modal-status-label">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'purchase' && (
        <form onSubmit={handlePurchaseSubmit} className="inv-modal-form">
          {isError && (
            <FormMessage variant="error">Erreur lors de l'ajout. Veuillez réessayer.</FormMessage>
          )}

          <Input
            label="Date d'achat"
            id="inv-purchased-at"
            type="date"
            required
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            autoFocus
          />

          <Input
            label="Prix payé (€) — optionnel"
            id="inv-price"
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            hideRequired
          />

          <div className="inv-modal-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep('status')}
              disabled={isPending}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Retour
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              Ajouter
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
