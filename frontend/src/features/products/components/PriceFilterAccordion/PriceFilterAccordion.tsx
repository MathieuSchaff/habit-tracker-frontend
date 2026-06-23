import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'

import { PriceRangeFilter } from '@/features/products/components/PriceRangeFilter/PriceRangeFilter'

type Props = {
  min?: number
  max?: number
  onChange: (next: { min?: number; max?: number }) => void
}

// Mirrors FilterAccordion's <details> shape. Open by default if a price is set; reopen when
// one gets applied externally (URL, chip), while leaving manual toggles untouched.
export function PriceFilterAccordion({ min, max, onChange }: Props) {
  const hasValue = min !== undefined || max !== undefined
  const [open, setOpen] = useState(hasValue)
  const contentId = useId()

  // Reopen on the false->true transition (external apply: URL, chip), leaving manual
  // toggles untouched. setState-during-render replaces a setState-in-effect the
  // React Compiler bailed on; same semantics, no extra post-paint render.
  const [prevHasValue, setPrevHasValue] = useState(hasValue)
  if (prevHasValue !== hasValue) {
    setPrevHasValue(hasValue)
    if (hasValue) setOpen(true)
  }

  return (
    <details
      className="filter-accordion filter-accordion--essential"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="filter-accordion__trigger" aria-controls={contentId}>
        <h3 className="filter-accordion__label">Prix</h3>
        <div className="filter-accordion__meta">
          {hasValue && (
            <span className="filter-accordion__count" title="Prix actif">
              €
            </span>
          )}
          <ChevronDown size={14} className="filter-accordion__chevron" aria-hidden="true" />
        </div>
      </summary>
      <div id={contentId} className="filter-accordion__body filter-accordion__body--padded">
        <PriceRangeFilter min={min} max={max} onChange={onChange} />
      </div>
    </details>
  )
}
