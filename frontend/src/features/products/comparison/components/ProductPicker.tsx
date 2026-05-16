import { COMPARISON_MAX_PRODUCTS } from '@habit-tracker/shared'

import { AsyncSearchSelect } from '@/component/Filter/AsyncSearchSelect/AsyncSearchSelect'
import { productQueries } from '@/lib/queries/products'

type Props = {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

const formatLabel = (p: { brand: string; name: string }) => `${p.brand} — ${p.name}`

export function ProductPicker({ selectedIds, onChange }: Props) {
  const atCap = selectedIds.length >= COMPARISON_MAX_PRODUCTS

  // Cap enforced here, not in AsyncSearchSelect, to stay correct if it ever adds optimistic UI.
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
      return
    }
    if (atCap) return
    onChange([...selectedIds, id])
  }

  return (
    <AsyncSearchSelect
      selected={selectedIds}
      onToggle={handleToggle}
      label="Produits à comparer"
      placeholder={atCap ? 'Limite atteinte' : 'Rechercher un produit'}
      loadOptionsQuery={(q: string) => ({
        ...productQueries.searchFlat(q),
        select: (items: { id: string; name: string; brand: string }[]) =>
          items.map((p) => ({ value: p.id, label: formatLabel(p) })),
      })}
      resolveValuesQuery={(ids: string[]) => ({
        ...productQueries.byIds(ids),
        select: (items: { id: string; name: string; brand: string }[]) =>
          items.map((p) => ({ value: p.id, label: formatLabel(p) })),
      })}
    />
  )
}
