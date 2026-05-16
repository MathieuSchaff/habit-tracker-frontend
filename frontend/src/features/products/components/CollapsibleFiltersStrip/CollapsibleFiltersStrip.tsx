import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { Button } from '@/component/Button/Button'

type Props = {
  count: number
  onOpenDrawer: () => void
  children: ReactNode
}

// Mounts only when count > 0, so default-open keeps filters visible on first appearance.
export function CollapsibleFiltersStrip({ count, onOpenDrawer, children }: Props) {
  const [open, setOpen] = useState(true)
  if (count === 0) return null
  const plural = count > 1 ? 's' : ''
  return (
    <div className={`products-chips-collapsible${open ? ' products-chips-collapsible--open' : ''}`}>
      <div className="products-chips-toggle-row">
        <Button
          variant="bare"
          className="products-chips-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${count} filtre${plural} actif${plural} — ${open ? 'masquer' : 'voir les filtres'}`}
        >
          <SlidersHorizontal size={13} className="products-chips-toggle__icon" aria-hidden="true" />
          <span>
            <strong>{count}</strong> filtre{plural} actif{plural}
          </span>
          <ChevronDown
            size={13}
            className={`products-chips-toggle__chevron${open ? ' products-chips-toggle__chevron--open' : ''}`}
            aria-hidden="true"
          />
        </Button>
        <Button
          variant="bare"
          className="products-chips-toggle__edit"
          onClick={onOpenDrawer}
          aria-label="Modifier les filtres"
        >
          Modifier
        </Button>
      </div>
      <div className="products-chips-body" inert={!open}>
        <div className="products-chips-inner">{children}</div>
      </div>
    </div>
  )
}
