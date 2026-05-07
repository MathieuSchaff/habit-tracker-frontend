import { Input } from '@/component/Input/Input'

interface PurchaseFieldsProps {
  idPrefix: string
  purchasedAt: string
  onPurchasedAtChange: (value: string) => void
  purchasePrice: string
  onPurchasePriceChange: (value: string) => void
  expiresAt: string
  onExpiresAtChange: (value: string) => void
}

export function PurchaseFields({
  idPrefix,
  purchasedAt,
  onPurchasedAtChange,
  purchasePrice,
  onPurchasePriceChange,
  expiresAt,
  onExpiresAtChange,
}: PurchaseFieldsProps) {
  return (
    <div className="qa-purchase-fields">
      <Input
        id={`${idPrefix}-purchased-at`}
        label="Date d'achat"
        type="date"
        value={purchasedAt}
        onChange={(e) => onPurchasedAtChange(e.target.value)}
        required
      />
      <Input
        id={`${idPrefix}-purchase-price`}
        label="Prix payé (€) — optionnel"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={purchasePrice}
        onChange={(e) => onPurchasePriceChange(e.target.value)}
      />
      <Input
        id={`${idPrefix}-expires-at`}
        label="Date d'expiration — optionnel"
        type="date"
        value={expiresAt}
        onChange={(e) => onExpiresAtChange(e.target.value)}
      />
    </div>
  )
}
