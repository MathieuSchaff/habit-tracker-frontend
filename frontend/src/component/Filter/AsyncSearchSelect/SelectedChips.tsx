import { X } from 'lucide-react'

import type { FilterOption } from '../types'

// .chip styles live in ChipGroup.css; without this import they only load when a
// ChipGroup happens to be in the route's module graph (visit-order dependent).
import '@/component/Input/ChipGroup/ChipGroup.css'

type Props = {
  options: FilterOption[]
  onRemove: (value: string) => void
}

export function SelectedChips({ options, onRemove }: Props) {
  if (options.length === 0) return null
  return (
    <div className="search-select__selected">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="chip chip--sm chip--active chip--removable"
          onClick={() => onRemove(opt.value)}
          aria-label={`Retirer ${opt.label}`}
        >
          {opt.label}
          <X size={12} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
