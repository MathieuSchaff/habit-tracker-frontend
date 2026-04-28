import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'

import { PriceRangeFilter } from '@/features/products/components/PriceRangeFilter/PriceRangeFilter'

type Props = {
  min?: number
  max?: number
  onChange: (next: { min?: number; max?: number }) => void
}

// Mirrors FilterAccordion's <details>-based shape so it sits inside the
// essential block without breaking the rhythm. Open by default if a price
// is already set, collapsed otherwise to free vertical space at the top
// of the drawer.
export function PriceFilterAccordion({ min, max, onChange }: Props) {
  const hasValue = min !== undefined || max !== undefined
  const [initialOpen] = useState(() => hasValue)
  const contentId = useId()

  return (
    <details className="filter-accordion filter-accordion--essential" open={initialOpen}>
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
