import { ArrowDownUp, Check } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import { DropdownMenu } from '@/component/DropdownMenu/DropdownMenu'
import type { ProductSort } from '@/lib/queries/products'

import './SortControl.css'

type SortOption = { value: ProductSort; label: string }

const SORT_OPTIONS: SortOption[] = [
  { value: 'random', label: 'Découverte' },
  { value: 'name', label: 'Nom (A-Z)' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'newest', label: 'Nouveautés' },
]

type Props = {
  value: ProductSort
  onChange: (sort: ProductSort) => void
}

export function SortControl({ value, onChange }: Props) {
  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0]

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="list-filter-btn sort-control__trigger"
          aria-label={`Tri : ${current?.label}`}
        >
          <ArrowDownUp size={14} aria-hidden="true" />
          <span>{current?.label}</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" ariaLabel="Options de tri">
        {SORT_OPTIONS.map((opt, i) => (
          <DropdownMenu.Item key={opt.value} index={i} onSelect={() => onChange(opt.value)}>
            <button type="button" className="sort-control__item">
              <span>{opt.label}</span>
              {opt.value === value && (
                <Check size={14} aria-hidden="true" className="sort-control__check" />
              )}
            </button>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
