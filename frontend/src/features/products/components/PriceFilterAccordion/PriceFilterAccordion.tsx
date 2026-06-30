import { PriceRangeFilter } from '@/features/products/components/PriceRangeFilter/PriceRangeFilter'

type Props = {
  min?: number
  max?: number
  onChange: (next: { min?: number; max?: number }) => void
}

// A single price range is one control — a collapsible shell around it only added friction. Render it
// flat alongside the other inline single-control filters (brand, ingredient).
export function PriceFilterAccordion({ min, max, onChange }: Props) {
  return (
    <div className="filter-inline-group">
      {/* PriceRangeFilter self-labels via its <legend>Prix (€)</legend> — no extra label needed. */}
      <div className="filter-drawer__group filter-drawer__group--nested">
        <PriceRangeFilter min={min} max={max} onChange={onChange} />
      </div>
    </div>
  )
}
